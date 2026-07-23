// Estimativa de alcance (delivery_estimate) para uma segmentação e meta de otimização.
import { NextRequest, NextResponse } from 'next/server';
import { getMetaAccessToken } from '@/lib/facebook';
import { getDeliveryEstimate, TargetingSpec } from '@/lib/facebook-manage';

export async function POST(request: NextRequest) {
    try {
        const accessToken = getMetaAccessToken(request);
        if (!accessToken) {
            return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN não configurado. Insira o token na tela ou no arquivo .env' }, { status: 400 });
        }

        const body = await request.json();
        const { accountId, optimizationGoal, targeting } = body || {};

        if (!accountId || !optimizationGoal || !targeting || typeof targeting !== 'object') {
            return NextResponse.json(
                { success: false, error: 'accountId, optimizationGoal e targeting são obrigatórios' },
                { status: 400 }
            );
        }
        // Valida formato estrito (^(act_)?[0-9]+$) antes de interpolar no path da Graph API,
        // evitando injeção de path/query (ex.: '123/insights?...').
        const accountIdStr = String(accountId);
        if (!/^(act_)?\d+$/.test(accountIdStr)) {
            return NextResponse.json(
                { success: false, error: 'accountId inválido: use apenas dígitos, com prefixo act_ opcional' },
                { status: 400 }
            );
        }
        const rawAccountId = accountIdStr.startsWith('act_') ? accountIdStr.slice(4) : accountIdStr;

        const estimate = await getDeliveryEstimate(accessToken, rawAccountId, {
            targeting: targeting as TargetingSpec,
            optimizationGoal: String(optimizationGoal),
        });

        return NextResponse.json({ success: true, data: estimate });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190
            || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        return NextResponse.json(
            {
                success: false,
                error: error?.fb?.error_user_msg || error?.message || 'Erro ao calcular estimativa de alcance',
                code: error?.fb?.code || error?.code,
            },
            { status: isAuthError ? 401 : (error?.status || 500) }
        );
    }
}
