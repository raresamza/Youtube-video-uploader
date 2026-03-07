'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clapperboard, Play, Info, CheckCircle, Loader2 } from 'lucide-react';

type Status = 'idle' | 'submitting' | 'polling' | 'completed' | 'error';

export default function VideoGeneratorPage() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('low quality, worst quality, jpeg artifacts, blurry, oversaturated colors, distorted anatomy, extra limbs, extra legs, multiple heads, bad proportions, deformed animal, mutated body, cartoon style, painting, illustration, text, watermark, subtitles, logo, grainy image, flickering frames, duplicated subject, glitch effects, messy background, static frame, frozen motion, unrealistic colors');
    const [status, setStatus] = useState<Status>('idle');
    const [statusText, setStatusText] = useState('Ready for input.');
    const [progress, setProgress] = useState(0);
    const [resultFiles, setResultFiles] = useState<any[]>([]);

    // Use refs for WebSocket so we don't reconnect on state changes
    const wsRef = useRef<WebSocket | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const clientId = useRef(Math.random().toString(36).substring(2, 15)).current;

    // Clean up WS and polling on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setStatus('submitting');
        setStatusText('Submitting to ComfyUI...');
        setResultFiles([]);
        setProgress(0);

        try {
            const res = await fetch('/api/comfy/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preset: 'wan22_shorts_9_16',
                    topic: prompt,
                    style: '',
                    negativePrompt: negativePrompt,
                    seed: '',
                    clientId: clientId
                })
            });
            const data = await res.json();

            if (data.prompt_id) {
                setStatus('polling');
                setStatusText(`Queued. Interfacing with ComfyUI...`);
                // Start WebSocket connection to listen for real progress
                connectWebSocket(data.prompt_id);
            } else {
                setStatus('error');
                setStatusText('Error: ' + (data.error || 'Unknown error from ComfyUI.'));
            }
        } catch (err: any) {
            setStatus('error');
            setStatusText('Error: Could not reach ComfyUI. Is it running at 127.0.0.1:8188?');
        }
    };

    const connectWebSocket = (promptId: string) => {
        try {
            // Adjust this if Comfy is on a different host
            const ws = new WebSocket(`ws://127.0.0.1:8000/ws?clientId=${clientId}`);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatusText('Connected to ComfyUI. Waiting in queue...');
            };

            ws.onmessage = (event) => {
                try {
                    if (typeof event.data !== 'string') return;
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'status') {
                        if (msg.data.status?.exec_info?.queue_remaining === 0 && status !== 'completed') {
                            // Could mean it finished quickly before we saw it, fallback check
                            checkFinalOutput(promptId);
                        }
                    } else if (msg.type === 'execution_start') {
                        setStatusText('Rendering started on GPU...');
                    } else if (msg.type === 'progress') {
                        // Real progress from ComfyUI (value / max)
                        const pData = msg.data;
                        const percentage = Math.round((pData.value / pData.max) * 100);
                        setProgress(percentage);
                        setStatusText(`Rendering frame ${pData.value}/${pData.max} Node: ${pData.node}`);
                    } else if (msg.type === 'executing') {
                        if (msg.data.node === null) {
                            // Finished executing
                            ws.close();
                            checkFinalOutput(promptId);
                        }
                    } else if (msg.type === 'execution_cached') {
                        setStatusText('Reusing cached render...');
                        checkFinalOutput(promptId);
                    } else if (msg.type === 'execution_error') {
                        ws.close();
                        setStatus('error');
                        setStatusText('Render failed in ComfyUI: ' + msg.data.exception_message);
                    }
                } catch (e) {
                    console.error('WS parse error', e);
                }
            };

            ws.onerror = () => {
                console.warn('WebSocket failed. Falling back to HTTP polling.');
                fallbackPollStatus(promptId);
            };

            ws.onclose = () => {
                if (status === 'polling') {
                    // Usually means Comfy closed but we aren't done, or we missed executing=null
                    fallbackPollStatus(promptId);
                }
            };
        } catch {
            fallbackPollStatus(promptId);
        }
    };

    const checkFinalOutput = async (promptId: string) => {
        try {
            const res = await fetch(`/api/comfy/status?promptId=${promptId}`);
            const data = await res.json();
            if (data.status === 'completed') {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                setStatus('completed');
                setStatusText('Pipeline complete. Output ready.');
                setProgress(100);
                setResultFiles(data.files || []);
            }
        } catch { }
    };

    const fallbackPollStatus = (id: string) => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        let attempts = 0;
        pollingIntervalRef.current = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`/api/comfy/status?promptId=${id}`);
                const data = await res.json();
                if (data.status === 'completed') {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    if (wsRef.current) wsRef.current.close();
                    setStatus('completed');
                    setStatusText('Pipeline complete. Output ready.');
                    setProgress(100);
                    setResultFiles(data.files || []);
                } else if (data.status === 'processing') {
                    setStatusText(`Rendering in progress... (${attempts * 2}s elapsed)`);
                    setProgress(prev => {
                        if (prev < 40) return prev + 3;
                        if (prev < 70) return prev + 1;
                        if (prev < 90) return prev + 0.5;
                        if (prev < 95) return prev + 0.1;
                        return prev;
                    });
                }
                if (attempts > 300 && pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); // 10 min timeout
            } catch {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                setStatus('error');
                setStatusText('Lost connection to ComfyUI while polling.');
            }
        }, 2000);
    };

    const useForUpload = (file: any) => {
        localStorage.setItem('last_video_path', JSON.stringify(file));
        router.push('/metadata');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">Video Generator</h1>
                <p className="text-sm text-muted-foreground">Submit a prompt to your local ComfyUI server to render your video pipeline.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Form */}
                <Card className="shadow-sm border">
                    <CardHeader className="flex flex-row items-center gap-3 pb-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clapperboard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Scene Director</CardTitle>
                            <CardDescription className="text-xs mt-0.5">Craft your vision. Our AI pipeline handles the rest.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                    Positive Prompt
                                </label>
                                <Textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    placeholder="Describe the scene in cinematic detail... e.g., 'A wolf running through a snowy forest, golden hour lighting, cinematic tracking shot, ultra realistic'"
                                    className="min-h-36 resize-none bg-white text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                                    Negative Prompt
                                </label>
                                <Textarea
                                    value={negativePrompt}
                                    onChange={e => setNegativePrompt(e.target.value)}
                                    placeholder="What to avoid... e.g., blurry, low quality, watermark, text"
                                    className="min-h-24 resize-none bg-white text-sm text-muted-foreground"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 font-semibold gap-2"
                                disabled={status === 'submitting' || status === 'polling'}
                            >
                                {status === 'polling' || status === 'submitting'
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Rendering...</>
                                    : <><Play className="w-4 h-4" /> Initialize Render</>
                                }
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Right: Status panel */}
                <Card className="shadow-sm border">
                    <CardHeader className="pb-2">
                        <p className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Pipeline Status</p>
                    </CardHeader>
                    <CardContent>
                        {status === 'idle' && (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                                <Info className="w-7 h-7" />
                                <p className="text-sm">{statusText}</p>
                            </div>
                        )}

                        {(status === 'submitting' || status === 'polling') && (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 text-primary w-full max-w-sm mx-auto">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <p className="text-sm text-center text-muted-foreground">{statusText}</p>
                                <div className="w-full mt-4 space-y-1">
                                    <Progress value={progress} className="w-full h-2" />
                                    <p className="text-xs text-right text-muted-foreground font-mono">{Math.round(progress)}%</p>
                                </div>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="flex flex-col items-center justify-center py-10 gap-2 text-destructive">
                                <Info className="w-7 h-7" />
                                <p className="text-sm text-center">{statusText}</p>
                            </div>
                        )}

                        {status === 'completed' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-green-600 pb-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm font-semibold">Output Ready</span>
                                </div>
                                {resultFiles.map((file, i) => (
                                    <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border bg-white">
                                        <p className="text-xs font-mono text-muted-foreground truncate">{file.filename}</p>
                                        <p className="text-xs text-muted-foreground">{file.subfolder} · {file.type}</p>
                                        <Button
                                            size="sm"
                                            className="w-full bg-primary hover:bg-primary/90 text-xs"
                                            onClick={() => useForUpload(file)}
                                        >
                                            Use for Upload →
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
