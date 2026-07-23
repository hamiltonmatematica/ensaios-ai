// Rotas de públicos personalizados: listar (GET) e criar lista/lookalike (POST).
import { NextRequest, NextResponse } from 'next/server';
import { getMetaAccessToken } from '@/lib/facebook';
import { requireWriteToken } from '@/lib/meugestor-write-guard';
import { listAudiences, createCustomAudience, createLookalike } from '@/lib/facebook-manage';

export const dynamic = 'force-dynamic';

function normalizeAccountId(accountId: string): string {
    return accountId.startsWith('act_') ? accountId.slice(4) : accountId;
}

function isTosError(error: any): boolean {
    const fbCode = error?.fb?.code ?? error?.code;
    const fbSubcode = error?.fb?.error_subcode;
    const msg = String(error?.fb?.message || error?.message || '').toLowerCase();
    return fbCode === 2654 || fbCode === 2655
        || fbSubcode === 2654 || fbSubcode === 1870034
        || msg.includes('terms of service') || msg.includes('termos de serviço');
}

function tosResponse(accountId: string, error: any) {
    return NextResponse.json(
        {
            success: false,
            error: 'A conta precisa aceitar os Termos de Públicos Personalizados.',
            tosUrl: 'https://business.facebook.com/ads/manage/customaudiences/tos/?act=' + accountId,
            code: error?.fb?.code || error?.code,
        },
        { status: 403 }
    );
}

function errorResponse(error: any, fallback: string) {
    const isAuthError = error?.fb?.code === 190 || error?.code === 190
        || error?.message?.includes('OAuth') || error?.message?.includes('access token');
    return NextResponse.json(
        {
            success: false,
            error: error?.fb?.error_user_msg || error?.message || fallback,
            code: error?.fb?.code || error?.code,
        },
        { status: isAuthError ? 401 : (error?.status || 500) }
    );
}

export async function GET(request: NextRequest) {
    let accountId = '';
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
        accountId = normalizeAccountId(rawAccount);

        const audiences = await listAudiences(accessToken, accountId);

        return NextResponse.json({ success: true, data: audiences });
    } catch (error: any) {
        if (isTosError(error)) return tosResponse(accountId, error);
        return errorResponse(error, 'Erro ao listar públicos');
    }
}

export async function POST(request: NextRequest) {
    let accountId = '';
    try {
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json();
        const { kind, name, description, originAudienceId, country, ratio } = body || {};
        if (!body?.accountId) {
            return NextResponse.json({ success: false, error: 'accountId é obrigatório' }, { status: 400 });
        }
        accountId = normalizeAccountId(String(body.accountId));

        if (kind !== 'list' && kind !== 'lookalike') {
            return NextResponse.json({ success: false, error: "kind deve ser 'list' ou 'lookalike'" }, { status: 400 });
        }

        let data: any;
        if (kind === 'list') {
            if (!name || !String(name).trim()) {
                return NextResponse.json({ success: false, error: 'name é obrigatório para criar uma lista' }, { status: 400 });
            }
            data = await createCustomAudience(accessToken, accountId, {
                name: String(name).trim(),
                ...(description ? { description: String(description) } : {}),
            });
        } else {
            if (!originAudienceId || !country || typeof ratio !== 'number' || ratio <= 0 || ratio > 0.2) {
                return NextResponse.json(
                    { success: false, error: 'originAudienceId, country e ratio (0.01 a 0.2) são obrigatórios para lookalike' },
                    { status: 400 }
                );
            }
            data = await createLookalike(accessToken, accountId, {
                originAudienceId: String(originAudienceId),
                country: String(country).toUpperCase(),
                ratio,
            });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        if (isTosError(error)) return tosResponse(accountId, error);
        return errorResponse(error, 'Erro ao criar público');
    }
}
