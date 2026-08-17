import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, resolveAccountHierarchy, saveConnection } from '@/lib/google-ads-oauth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const redirectBase = `${origin}/meugestor`;

    if (error) {
        return NextResponse.redirect(`${redirectBase}?google_ads_connect=error&msg=${encodeURIComponent(error)}`);
    }
    if (!code) {
        return NextResponse.redirect(`${redirectBase}?google_ads_connect=error&msg=${encodeURIComponent('Código de autorização ausente.')}`);
    }

    try {
        const redirectUri = `${origin}/api/auth/google-ads/callback`;
        const { access_token, refresh_token } = await exchangeCodeForTokens(code, redirectUri);
        const loginCustomerIds = await resolveAccountHierarchy(access_token);
        await saveConnection(refresh_token, loginCustomerIds);
        return NextResponse.redirect(`${redirectBase}?google_ads_connect=success`);
    } catch (e: any) {
        return NextResponse.redirect(`${redirectBase}?google_ads_connect=error&msg=${encodeURIComponent(e.message || 'Erro desconhecido')}`);
    }
}
