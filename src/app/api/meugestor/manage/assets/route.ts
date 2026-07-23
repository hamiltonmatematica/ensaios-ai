// Ativos da conta para criação de anúncios: pixels, páginas e criativos recentes (em paralelo).
import { NextRequest, NextResponse } from 'next/server';
import { getMetaAccessToken } from '@/lib/facebook';
import { listPixels, listPages, listRecentCreatives } from '@/lib/facebook-manage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const accessToken = getMetaAccessToken(request);
        if (!accessToken) {
            return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN não configurado. Insira o token na tela ou no arquivo .env' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const rawAccount = searchParams.get('accountId');
        if (!rawAccount) {
            return NextResponse.json({ success: false, error: 'accountId é obrigatório' }, { status: 400 });
        }
        const accountId = rawAccount.startsWith('act_') ? rawAccount.slice(4) : rawAccount;

        const [pixelsRes, pagesRes, creativesRes] = await Promise.allSettled([
            listPixels(accessToken, accountId),
            listPages(accessToken, accountId),
            listRecentCreatives(accessToken, accountId),
        ]);

        const pixels = pixelsRes.status === 'fulfilled' ? pixelsRes.value : [];
        const pages = pagesRes.status === 'fulfilled' ? pagesRes.value : [];
        const creatives = creativesRes.status === 'fulfilled' ? creativesRes.value : [];

        return NextResponse.json({ success: true, data: { pixels, pages, creatives } });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190
            || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        return NextResponse.json(
            {
                success: false,
                error: error?.fb?.error_user_msg || error?.message || 'Erro ao buscar ativos da conta',
                code: error?.fb?.code || error?.code,
            },
            { status: isAuthError ? 401 : (error?.status || 500) }
        );
    }
}
