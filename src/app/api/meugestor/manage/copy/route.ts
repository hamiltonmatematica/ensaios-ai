// Rota de duplicação (cópia) de campanhas, conjuntos e anúncios Meta Ads
import { NextRequest, NextResponse } from 'next/server';
import { requireWriteToken, isNumericId } from '@/lib/meugestor-write-guard';
import { copyEntity } from '@/lib/facebook-manage';

const VALID_KINDS = ['campaign', 'adset', 'ad'] as const;
type CopyKind = typeof VALID_KINDS[number];

export async function POST(request: NextRequest) {
    try {
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ success: false, error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 });
        }

        const { id, kind, deep, suffix } = body as {
            id?: string; kind?: CopyKind; deep?: boolean; suffix?: string;
        };

        if (!id || !isNumericId(String(id))) {
            return NextResponse.json({ success: false, error: 'id é obrigatório e deve ser o id numérico do objeto' }, { status: 400 });
        }
        if (!kind || !VALID_KINDS.includes(kind)) {
            return NextResponse.json({ success: false, error: "kind inválido: use 'campaign', 'adset' ou 'ad'" }, { status: 400 });
        }

        const result = await copyEntity(accessToken, {
            id: String(id),
            kind,
            deep: !!deep,
            ...(typeof suffix === 'string' && suffix ? { suffix } : {}),
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190 || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        const status = isAuthError ? 401 : (error?.status || 500);
        const errorMsg = isAuthError
            ? 'Token de acesso da Meta (META_ACCESS_TOKEN) está inválido ou expirado.'
            : (error?.fb?.error_user_msg || error?.message || 'Erro ao duplicar item');

        return NextResponse.json(
            { success: false, error: errorMsg, code: error?.fb?.code || error?.code },
            { status }
        );
    }
}
