// Busca de segmentação na Meta: interesses (adinterest) e localizações (adgeolocation).
import { NextRequest, NextResponse } from 'next/server';
import { getMetaAccessToken } from '@/lib/facebook';
import { searchTargeting } from '@/lib/facebook-manage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const accessToken = getMetaAccessToken(request);
        if (!accessToken) {
            return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN não configurado. Insira o token na tela ou no arquivo .env' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const q = (searchParams.get('q') || '').trim();
        const country = searchParams.get('country') || undefined;

        if (type !== 'interest' && type !== 'geo') {
            return NextResponse.json({ success: false, error: "type deve ser 'interest' ou 'geo'" }, { status: 400 });
        }
        if (q.length < 2) {
            return NextResponse.json({ success: false, error: 'q deve ter ao menos 2 caracteres' }, { status: 400 });
        }

        const results = await searchTargeting(accessToken, { type, q, ...(country ? { country } : {}) });

        return NextResponse.json({ success: true, data: results });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190
            || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        return NextResponse.json(
            {
                success: false,
                error: error?.fb?.error_user_msg || error?.message || 'Erro na busca de segmentação',
                code: error?.fb?.code || error?.code,
            },
            { status: isAuthError ? 401 : (error?.status || 500) }
        );
    }
}
