import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/youtube';
import stream from 'stream';

export const runtime = 'nodejs';


export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const channelKey = formData.get('channelKey') as string;
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const tagsStr = formData.get('tags') as string;
        const file = formData.get('file') as File;

        if (!channelKey || !file) {
            return NextResponse.json({ error: 'channelKey and file are required' }, { status: 400 });
        }

        let tags = [];
        try {
            tags = tagsStr ? JSON.parse(tagsStr) : [];
        } catch {
            // ignore
        }

        const youtube = await getAuthenticatedClient(channelKey);

        // Verify auth before proceeding
        try {
            const channelRes = await youtube.channels.list({ part: ['snippet', 'id'], mine: true });
            const channel = channelRes.data.items?.[0];
            if (!channel) {
                console.error('[YouTube] No channel found for this account.');
                return NextResponse.json({
                    error: 'No YouTube Channel',
                    details: 'This Google account does not have a YouTube channel. Please create one at youtube.com'
                }, { status: 403 });
            }
            console.log(`[YouTube] Auth confirmed for: ${channel.snippet?.title} (${channel.id})`);
        } catch (authErr: any) {
            console.error('[YouTube] Auth verification failed:', authErr.response?.data || authErr.message);
            return NextResponse.json({
                error: 'Authentication failed',
                details: authErr.response?.data?.error_description || 'Invalid or expired tokens. Please relink your account.'
            }, { status: 401 });
        }

        // Convert File to readable stream
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileStream = new stream.PassThrough();
        fileStream.end(buffer);

        console.log(`[YouTube] Starting upload for: ${title}`);

        // Resumable upload is supported by tracking it internally by googleapis
        const res = await youtube.videos.insert(
            {
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title: title || 'Generated Video',
                        description: description || '',
                        tags: tags,
                        categoryId: '22', // People & Blogs
                    },
                    status: {
                        privacyStatus: 'private', // Safe default
                    },
                },
                media: {
                    body: fileStream,
                    mimeType: file.type || 'video/mp4',
                },
            },
            {
                onUploadProgress: (evt: any) => {
                    if (evt.bytesRead) {
                        console.log(`[YouTube] Uploading: ${Math.round((evt.bytesRead / buffer.length) * 100)}%`);
                    }
                },
            }
        );

        console.log(`[YouTube] Upload finished! Video ID: ${res.data.id}`);
        return NextResponse.json({ success: true, videoId: res.data.id });
    } catch (error: any) {
        // Log the full error for debugging
        const errorData = error.response?.data || error;
        console.error('[YouTube] Critical Upload Error:', JSON.stringify(errorData, null, 2));

        return NextResponse.json({
            error: 'Failed to upload video',
            details: error.message,
            googleError: error.response?.data?.error || null
        }, { status: 500 });
    }
}
