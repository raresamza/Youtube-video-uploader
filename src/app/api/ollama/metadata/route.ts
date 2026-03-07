import { NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export async function POST(req: Request) {
    try {
        const { topic } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const prompt = `Generate metadata for a YouTube video about: "${topic}".
Respond ONLY with a valid JSON object matching this schema exactly, do not return any wrapper text or formatting:
{
  "title": "A catchy YouTube title",
  "description": "A well written description (2-3 sentences)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "chapters": "00:00 Intro\n01:00 Topic 1\n02:00 Conclusion"
}`;

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen3-coder:30b', // Using the correct Qwen 2.5 Coder 32B model identifier (there is no qwen3 yet)
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Ollama error:', text);
            return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
        }

        const data = await response.json();
        let result;
        try {
            result = JSON.parse(data.response);
        } catch (e) {
            console.error("Failed to parse Ollama JSON response", data.response);
            result = { title: "", description: "", tags: [], chapters: "" };
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in Ollama metadata route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
