// Rota de criação de conjuntos de anúncios (ad sets) Meta Ads (suporta validate_only)
import { NextRequest, NextResponse } from 'next/server';
import { requireWriteToken } from '@/lib/meugestor-write-guard';
import { createAdSet, AdSetInput } from '@/lib/facebook-manage';

const badBudget = (v: unknown) => v !== undefined && (!Number.isInteger(v) || (v as number) <= 0);

// TODO: extrair isTosError/tosResponse (duplicado de manage/audiences/route.ts) para um helper compartilhado
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

export async function POST(request: NextRequest) {
    let tosAccountId = '';
    try {
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ success: false, error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 });
        }

        const { accountId, validateOnly, adset } = body as {
            accountId?: string; validateOnly?: boolean; adset?: AdSetInput;
        };

        if (!accountId) {
            return NextResponse.json({ success: false, error: 'accountId é obrigatório' }, { status: 400 });
        }
        if (!adset || typeof adset !== 'object') {
            return NextResponse.json({ success: false, error: 'adset é obrigatório' }, { status: 400 });
        }
        if (!adset.name?.trim()) {
            return NextResponse.json({ success: false, error: 'Nome do conjunto de anúncios é obrigatório' }, { status: 400 });
        }
        if (!adset.campaignId) {
            return NextResponse.json({ success: false, error: 'campaignId é obrigatório' }, { status: 400 });
        }
        if (!adset.optimizationGoal) {
            return NextResponse.json({ success: false, error: 'optimizationGoal é obrigatório' }, { status: 400 });
        }
        if (!adset.targeting || typeof adset.targeting !== 'object') {
            return NextResponse.json({ success: false, error: 'targeting é obrigatório (defina ao menos a localização)' }, { status: 400 });
        }
        if (badBudget(adset.dailyBudgetCents) || badBudget(adset.lifetimeBudgetCents)) {
            return NextResponse.json({ success: false, error: 'Orçamento inválido: informe centavos como número inteiro positivo' }, { status: 400 });
        }
        if (adset.lifetimeBudgetCents !== undefined && !adset.endTime) {
            return NextResponse.json({ success: false, error: 'Orçamento total (lifetime) exige data de término (endTime)' }, { status: 400 });
        }

        const rawAccountId = String(accountId).replace(/^act_/, '');
        tosAccountId = rawAccountId;

        const input: AdSetInput = {
            ...adset,
            name: adset.name.trim(),
            status: adset.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
        };

        const result = await createAdSet(accessToken, rawAccountId, input, !!validateOnly);
        const data = validateOnly ? { validated: true } : result;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        if (isTosError(error)) return tosResponse(tosAccountId, error);
        const isAuthError = error?.fb?.code === 190 || error?.code === 190 || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        const status = isAuthError ? 401 : (error?.status || 500);
        const errorMsg = isAuthError
            ? 'Token de acesso da Meta (META_ACCESS_TOKEN) está inválido ou expirado.'
            : (error?.fb?.error_user_msg || error?.message || 'Erro ao criar conjunto de anúncios');

        return NextResponse.json(
            { success: false, error: errorMsg, code: error?.fb?.code || error?.code },
            { status }
        );
    }
}
