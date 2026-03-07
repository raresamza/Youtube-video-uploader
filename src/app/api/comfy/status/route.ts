import { NextResponse } from 'next/server';

const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8188';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get('promptId');

    if (!promptId) {
        return NextResponse.json({ error: 'promptId is required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${COMFY_URL}/history/${promptId}`);
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
        }

        const history = await response.json();
        const promptHistory = history[promptId];

        if (!promptHistory) {
            // Not in history yet, could be queuing or processing
            // Also check queue just in case
            const queueRes = await fetch(`${COMFY_URL}/queue`);
            const queueData = await queueRes.json();

            const isPending = queueData.queue_running.some((q: any) => q[1] === promptId) ||
                queueData.queue_pending.some((q: any) => q[1] === promptId);

            if (isPending) {
                return NextResponse.json({ status: 'processing' });
            }

            return NextResponse.json({ status: 'not_found' });
        }

        // It is in history, check outputs
        const outputs = promptHistory.outputs;
        let files: { filename: string; subfolder: string; type: string; url: string }[] = [];

        if (outputs) {
            for (const nodeId in outputs) {
                const nodeOutput = outputs[nodeId];
                // Usually VideoCombine outputs to 'gifs' or 'images'
                const outputList = nodeOutput.gifs || nodeOutput.images || [];
                for (const file of outputList) {
                    files.push({
                        ...file,
                        url: `${COMFY_URL}/view?filename=${file.filename}&subfolder=${file.subfolder}&type=${file.type}`
                    });
                }
            }
        }

        return NextResponse.json({
            status: 'completed',
            files
        });
    } catch (error) {
        console.error('Error fetching ComfyUI status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
