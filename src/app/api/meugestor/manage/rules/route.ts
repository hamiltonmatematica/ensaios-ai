// Regras automatizadas (adrules_library): listar, criar por template e excluir.
import { NextRequest, NextResponse } from 'next/server';
import { getMetaAccessToken } from '@/lib/facebook';
import { requireWriteToken } from '@/lib/meugestor-write-guard';
import { listAdRules, createAdRule, deleteAdRule } from '@/lib/facebook-manage';

export const dynamic = 'force-dynamic';

type RuleTemplate = 'pause_no_results' | 'pause_high_cpa' | 'pause_high_spend';
type RuleEntityType = 'AD' | 'ADSET' | 'CAMPAIGN';

const TEMPLATES: RuleTemplate[] = ['pause_no_results', 'pause_high_cpa', 'pause_high_spend'];
const ENTITY_TYPES: RuleEntityType[] = ['AD', 'ADSET', 'CAMPAIGN'];

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

function buildFilters(
    template: RuleTemplate,
    entityType: RuleEntityType,
    params: { spendCents?: number; cpaCents?: number; days?: number }
): Record<string, unknown>[] {
    const days = params.days ?? 1;
    const timePreset = days <= 1 ? 'TODAY' : days <= 3 ? 'LAST_3_DAYS' : 'LAST_7_DAYS';

    const filters: Record<string, unknown>[] = [
        { field: 'entity_type', value: entityType, operator: 'EQUAL' },
        { field: 'time_preset', value: timePreset, operator: 'EQUAL' },
    ];

    if (template === 'pause_high_spend') {
        filters.push({ field: 'spent', value: params.spendCents, operator: 'GREATER_THAN' });
    } else if (template === 'pause_no_results') {
        filters.push({ field: 'spent', value: params.spendCents, operator: 'GREATER_THAN' });
        filters.push({ field: 'results', value: 1, operator: 'LESS_THAN' });
    } else {
        filters.push({ field: 'cost_per_result', value: params.cpaCents, operator: 'GREATER_THAN' });
        filters.push({ field: 'spent', value: Math.max(1, Math.round((params.cpaCents || 0) / 2)), operator: 'GREATER_THAN' });
    }

    return filters;
}

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

        const rules = await listAdRules(accessToken, accountId);

        return NextResponse.json({ success: true, data: rules });
    } catch (error: any) {
        return errorResponse(error, 'Erro ao listar regras');
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json();
        const { accountId, rule } = body || {};

        if (!accountId) {
            return NextResponse.json({ success: false, error: 'accountId é obrigatório' }, { status: 400 });
        }
        if (!rule || !rule.name || !String(rule.name).trim()) {
            return NextResponse.json({ success: false, error: 'rule.name é obrigatório' }, { status: 400 });
        }

        const template = rule.template as RuleTemplate;
        if (!TEMPLATES.includes(template)) {
            return NextResponse.json({ success: false, error: 'rule.template inválido' }, { status: 400 });
        }

        const entityType = rule.entityType as RuleEntityType;
        if (!ENTITY_TYPES.includes(entityType)) {
            return NextResponse.json({ success: false, error: "rule.entityType deve ser 'AD', 'ADSET' ou 'CAMPAIGN'" }, { status: 400 });
        }

        const params: { spendCents?: number; cpaCents?: number; days?: number } = rule.params || {};
        if ((template === 'pause_high_spend' || template === 'pause_no_results')
            && (typeof params.spendCents !== 'number' || params.spendCents <= 0)) {
            return NextResponse.json({ success: false, error: 'params.spendCents (centavos, > 0) é obrigatório para este template' }, { status: 400 });
        }
        if (template === 'pause_high_cpa'
            && (typeof params.cpaCents !== 'number' || params.cpaCents <= 0)) {
            return NextResponse.json({ success: false, error: 'params.cpaCents (centavos, > 0) é obrigatório para este template' }, { status: 400 });
        }

        const rawAccountId = String(accountId).startsWith('act_') ? String(accountId).slice(4) : String(accountId);

        const data = await createAdRule(accessToken, rawAccountId, {
            name: String(rule.name).trim(),
            status: 'ENABLED',
            evaluation_spec: {
                evaluation_type: 'SCHEDULE',
                filters: buildFilters(template, entityType, params),
            },
            execution_spec: { execution_type: 'PAUSE' },
            schedule_spec: { schedule_type: 'SEMI_HOURLY' },
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return errorResponse(error, 'Erro ao criar regra');
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // DELETE via query string não envia corpo JSON
        const auth = requireWriteToken(request, { requireJson: false });
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const { searchParams } = new URL(request.url);
        const ruleId = searchParams.get('ruleId');
        if (!ruleId || !/^[0-9]+$/.test(ruleId)) {
            return NextResponse.json({ success: false, error: 'ruleId é obrigatório e deve ser um id numérico' }, { status: 400 });
        }

        const rawAccount = searchParams.get('accountId');
        if (!rawAccount) {
            return NextResponse.json({ success: false, error: 'accountId é obrigatório' }, { status: 400 });
        }
        const accountId = rawAccount.startsWith('act_') ? rawAccount.slice(4) : rawAccount;

        // Confirma que o id pertence às regras (adrules_library) da conta antes de excluir,
        // impedindo que ids de campanhas/anúncios/públicos sejam apagados por este endpoint.
        const rules = await listAdRules(accessToken, accountId);
        const isRuleOfAccount = rules.some((r: { id?: string | number }) => String(r?.id) === ruleId);
        if (!isRuleOfAccount) {
            return NextResponse.json({ success: false, error: 'Regra não encontrada nesta conta' }, { status: 404 });
        }

        const data = await deleteAdRule(accessToken, ruleId);

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return errorResponse(error, 'Erro ao excluir regra');
    }
}
