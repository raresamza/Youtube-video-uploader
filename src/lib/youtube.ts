import { google } from 'googleapis';
import { readJson, writeJson } from './storage';

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/oauth/callback'
    );
};

export const getAuthUrl = (channelKey: string) => {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly'
        ],
        prompt: 'consent',
        state: channelKey
    });
};

export const getTokensFromCode = async (code: string) => {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};

export const getAuthenticatedClient = async (channelKey: string) => {
    const tokensInfo = await readJson<Record<string, any>>('tokens.json', {});
    const tokens = tokensInfo[channelKey];

    if (!tokens || !tokens.refresh_token) {
        throw new Error(`No refresh token found for channel: ${channelKey}. Please authenticate first.`);
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Set up automatic token refreshing and saving
    oauth2Client.on('tokens', (newTokens) => {
        saveTokens(channelKey, newTokens);
    });

    return google.youtube({ version: 'v3', auth: oauth2Client });
};

export const saveTokens = async (channelKey: string, tokens: any) => {
    const tokensInfo = await readJson<Record<string, any>>('tokens.json', {});
    tokensInfo[channelKey] = {
        ...tokensInfo[channelKey],
        ...tokens
    };
    await writeJson('tokens.json', tokensInfo);
};
