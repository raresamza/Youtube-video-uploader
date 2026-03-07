import { NextResponse } from 'next/server';
import { getTokensFromCode, saveTokens } from '@/lib/youtube';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Used as channelKey
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error }, { status: 400 });
    }

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    try {
        const tokens = await getTokensFromCode(code);
        await saveTokens(state, tokens);

        // Redirect back to home with a success parameter
        return NextResponse.redirect(new URL('/?oauth=success', req.url));
    } catch (err: any) {
        console.error('Error during OAuth callback:', err);
        return NextResponse.json({ error: 'OAuth callback failed', details: err.message }, { status: 500 });
    }
}
