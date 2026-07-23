// Rota de criação de campanhas Meta Ads (suporta validação prévia via validate_only)
import { NextRequest, NextResponse } from 'next/server';
import { requireWriteToken } from '@/lib/meugestor-write-guard';
import { createCampaign, CampaignInput } from '@/lib/facebook-manage';

const VALID_OBJECTIVES: CampaignInput['objective'][] = [
    'OUTCOME_TRAFFIC', 'OUTCOME_LEADS', 'OUTCOME_SALES',
    'OUTCOME_ENGAGEMENT', 'OUTCOME_AWARENESS', 'OUTCOME_APP_PROMOTION',
];

const badBudget = (v: unknown) => v !== undefined && (!Number.isInteger(v) || (v as number) <= 0);

export async function POST(request: NextRequest) {
    try {
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ success: false, error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 });
        }

        const { accountId, validateOnly, campaign } = body as {
            accountId?: string; validateOnly?: boolean; campaign?: CampaignInput;
        };

        if (!accountId) {
            return NextResponse.json({ success: false, error: 'accountId é obrigatório' }, { status: 400 });
        }
        if (!campaign || typeof campaign !== 'object') {
            return NextResponse.json({ success: false, error: 'campaign é obrigatório' }, { status: 400 });
        }
        if (!campaign.name?.trim()) {
            return NextResponse.json({ success: false, error: 'Nome da campanha é obrigatório' }, { status: 400 });
        }
        if (!campaign.objective || !VALID_OBJECTIVES.includes(campaign.objective)) {
            return NextResponse.json({ success: false, error: 'Objetivo da campanha inválido' }, { status: 400 });
        }
        if (badBudget(campaign.dailyBudgetCents) || badBudget(campaign.lifetimeBudgetCents)) {
            return NextResponse.json({ success: false, error: 'Orçamento inválido: informe centavos como número inteiro positivo' }, { status: 400 });
        }

        const rawAccountId = String(accountId).replace(/^act_/, '');

        const input: CampaignInput = {
            name: campaign.name.trim(),
            objective: campaign.objective,
            status: campaign.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
            specialAdCategories: Array.isArray(campaign.specialAdCategories) ? campaign.specialAdCategories : [],
            ...(campaign.dailyBudgetCents !== undefined ? { dailyBudgetCents: campaign.dailyBudgetCents } : {}),
            ...(campaign.lifetimeBudgetCents !== undefined ? { lifetimeBudgetCents: campaign.lifetimeBudgetCents } : {}),
        };

        const result = await createCampaign(accessToken, rawAccountId, input, !!validateOnly);
        const data = validateOnly ? { validated: true } : result;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190 || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        const status = isAuthError ? 401 : (error?.status || 500);
        const errorMsg = isAuthError
            ? 'Token de acesso da Meta está inválido ou expirado. Atualize o token na tela.'
            : (error?.fb?.error_user_msg || error?.message || 'Erro ao criar campanha');

        return NextResponse.json(
            { success: false, error: errorMsg, code: error?.fb?.code || error?.code },
            { status }
        );
    }
}
