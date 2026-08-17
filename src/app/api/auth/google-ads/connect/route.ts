import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ success: false, error: 'GOOGLE_ADS_OAUTH_CLIENT_ID não configurado no servidor.' }, { status: 500 });
    }

    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/google-ads/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: 'https://www.googleapis.com/auth/adwords',
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
