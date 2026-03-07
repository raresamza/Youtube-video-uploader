'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Sparkles, Youtube, FileVideo, Loader2, CheckCircle } from 'lucide-react';

export default function MetadataHelperPage() {
    const [channelKey, setChannelKey] = useState('channelA');
    const [fileData, setFileData] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [topic, setTopic] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [chapters, setChapters] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('last_video_path');
        if (saved) setFileData(JSON.parse(saved));
    }, []);

    const handleGenerateMetadata = async () => {
        if (!topic.trim()) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/ollama/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });
            const data = await res.json();
            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            if (data.tags) setTags(Array.isArray(data.tags) ? data.tags.join(', ') : data.tags);
            if (data.chapters) setChapters(data.chapters);
        } catch {
            alert('Failed to reach Ollama. Is it running at localhost:11434?');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpload = async () => {
        if (!fileData && !selectedFile) {
            alert('No file selected.');
            return;
        }
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('channelKey', channelKey);
            formData.append('title', title);
            formData.append('description', description + (chapters ? '\n\n' + chapters : ''));
            const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
            formData.append('tags', JSON.stringify(tagsArray));

            if (selectedFile) {
                formData.append('file', selectedFile);
            } else if (fileData?.url) {
                const fileRes = await fetch(fileData.url);
                const blob = await fileRes.blob();
                formData.append('file', blob, fileData.filename);
            }

            const res = await fetch('/api/youtube/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setUploadSuccess(true);
            } else {
                alert('Upload failed: ' + (data.error || data.details));
            }
        } catch {
            alert('Error during upload. Check console.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">Metadata Helper</h1>
                <p className="text-sm text-muted-foreground">Generate titles, descriptions, and tags with Ollama, then upload directly to YouTube.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Topic + Generate */}
                <Card className="shadow-sm border">
                    <CardHeader className="flex flex-row items-center gap-3 pb-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">AI Metadata Generator</CardTitle>
                            <CardDescription className="text-xs">Let Ollama craft your video metadata.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Video Topic</Label>
                            <Input
                                placeholder="e.g. A futuristic city at night with neon lights"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                className="bg-white text-sm"
                            />
                        </div>
                        <Button
                            className="w-full bg-primary hover:bg-primary/90 font-semibold gap-2"
                            onClick={handleGenerateMetadata}
                            disabled={isGenerating || !topic.trim()}
                        >
                            {isGenerating
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                : <><Sparkles className="w-4 h-4" /> Generate Metadata</>
                            }
                        </Button>

                        <div className="pt-1 space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Title</Label>
                                <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-white text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Description</Label>
                                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="bg-white text-sm resize-none" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Tags (comma separated)</Label>
                                <Input value={tags} onChange={e => setTags(e.target.value)} className="bg-white text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Chapters</Label>
                                <Textarea value={chapters} onChange={e => setChapters(e.target.value)} rows={3} className="bg-white text-sm resize-none" placeholder="00:00 Intro&#10;01:00 Main Content" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Upload */}
                <Card className="shadow-sm border">
                    <CardHeader className="flex flex-row items-center gap-3 pb-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Youtube className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Neural Distribution</CardTitle>
                            <CardDescription className="text-xs">Upload your video to a linked YouTube channel.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Target Channel</Label>
                            <Select value={channelKey} onValueChange={setChannelKey}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="channelA">Channel Alpha</SelectItem>
                                    <SelectItem value="channelB">Channel Beta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Video File</Label>
                            {fileData && !selectedFile && (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700">
                                    <FileVideo className="w-4 h-4 shrink-0" />
                                    <span className="text-xs font-mono truncate">{fileData.filename}</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="video/*"
                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                id="file-input"
                                className="hidden"
                            />
                            <label
                                htmlFor="file-input"
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-dashed border-border bg-white text-sm text-muted-foreground cursor-pointer hover:bg-muted transition"
                            >
                                <Upload className="w-4 h-4" />
                                {selectedFile ? selectedFile.name : 'Choose a different file'}
                            </label>
                        </div>

                        <Button
                            className="w-full bg-primary hover:bg-primary/90 font-semibold gap-2 mt-4"
                            onClick={handleUpload}
                            disabled={isUploading || (!fileData && !selectedFile)}
                        >
                            {isUploading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                : <><Youtube className="w-4 h-4" /> Upload to YouTube</>
                            }
                        </Button>

                        {uploadSuccess && (
                            <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                <span className="text-sm font-medium">Upload successful! Processing on YouTube.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
