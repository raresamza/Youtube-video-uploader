import { NextResponse } from 'next/server';
import { getPreset } from '@/lib/storage';

const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8188';

export async function POST(req: Request) {
    try {
        const reqJson = await req.json();
        const { preset, topic, style, negativePrompt, seed, clientId } = reqJson;

        if (!preset || !topic) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Load preset
        const presetJson = await getPreset(preset);
        let presetString = JSON.stringify(presetJson);

        const seedValue = seed ? seed.toString() : Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();

        // Replace variables
        presetString = presetString.replace(/%%TOPIC%%/g, topic);
        presetString = presetString.replace(/%%STYLE%%/g, style || '');
        presetString = presetString.replace(/%%NEGATIVE_PROMPT%%/g, negativePrompt || '');
        // Replace "%%SEED%%" (with surrounding quotes) as a bare number so ComfyUI gets an integer
        presetString = presetString.replace(/"%%SEED%%"/g, seedValue);
        // Also handle legacy un-quoted usage just in case
        presetString = presetString.replace(/%%SEED%%/g, seedValue);

        const workflow = JSON.parse(presetString);

        // Queue prompt
        const payload = {
            prompt: workflow,
            client_id: reqJson.clientId // Optional: ties the job to the WebSocket connection
        };

        const response = await fetch(`${COMFY_URL}/prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('ComfyUI error:', text);
            return NextResponse.json({ error: 'Failed to queue prompt in ComfyUI' }, { status: 500 });
        }

        const data = await response.json();
        return NextResponse.json({ prompt_id: data.prompt_id, number: data.number });
    } catch (error) {
        console.error('Error in ComfyUI generate route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
