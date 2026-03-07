import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/youtube';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const channelKey = searchParams.get('channelKey');

    if (!channelKey) {
        return NextResponse.json({ error: 'channelKey is required' }, { status: 400 });
    }

    const url = getAuthUrl(channelKey);
    return NextResponse.redirect(url);
}
