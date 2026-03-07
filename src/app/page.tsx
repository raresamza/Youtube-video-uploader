'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Database, Share2, Youtube } from 'lucide-react';

const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

export default function SettingsPage() {
  const [comfyUrl, setComfyUrl] = useState(COMFY_URL);
  const [ollamaUrl, setOllamaUrl] = useState(OLLAMA_URL);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // Persist to localStorage so other pages can read dynamic URLs (optional enhancement)
    localStorage.setItem('comfyUrl', comfyUrl);
    localStorage.setItem('ollamaUrl', ollamaUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLink = (channelKey: string) => {
    window.location.href = `/api/youtube/oauth/start?channelKey=${channelKey}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-4">
        <h1 className="text-4xl font-extrabold text-primary">Workspace Control</h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Orchestrate your local AI pipeline and publishing channels from one high-performance command center.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Infrastructure */}
        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Service Infrastructure</CardTitle>
              <CardDescription className="text-xs mt-0.5">Define the endpoints for your local neural processing units.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">ComfyUI Pipeline</Label>
              <Input
                value={comfyUrl}
                onChange={e => setComfyUrl(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Ollama Cognitive Engine</Label>
              <Input
                value={ollamaUrl}
                onChange={e => setOllamaUrl(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <Button className="w-full mt-2 bg-primary hover:bg-primary/90 font-semibold" onClick={handleSave}>
              {saved ? '✓ Infrastructure Committed' : 'Commit Infrastructure'}
            </Button>
          </CardContent>
        </Card>

        {/* Neural Distribution */}
        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Neural Distribution</CardTitle>
              <CardDescription className="text-xs mt-0.5">Connect your cognitive output to external social networks.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Channel Alpha */}
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-white">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Youtube className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Channel Alpha</p>
                <p className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Standby</p>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs px-4" onClick={() => handleLink('channelA')}>
                Link
              </Button>
            </div>

            {/* Channel Beta */}
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-white">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                {/* TikTok icon via SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.88a8.27 8.27 0 0 0 4.84 1.56V7a4.85 4.85 0 0 1-1.07-.31z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Channel Beta</p>
                <p className="text-[10px] tracking-widest font-semibold text-muted-foreground uppercase">Standby</p>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs px-4" onClick={() => handleLink('channelB')}>
                Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
