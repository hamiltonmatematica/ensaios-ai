import { NextRequest, NextResponse } from 'next/server';
import { getAllAdAccounts, getAccountInsights, getActionValue, MetaDatePreset } from '@/lib/facebook';

const VALID_PRESETS: MetaDatePreset[] = ['today', 'yesterday', 'last_3d', 'last_7d', 'last_14d', 'last_28d', 'last_30d', 'this_month', 'last_month'];

export async function GET(request: NextRequest) {
    try {
        const accessToken = process.env.META_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN não configurado' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const datePreset = (searchParams.get('period') || 'last_7d') as MetaDatePreset;
        if (!VALID_PRESETS.includes(datePreset)) {
            return NextResponse.json({ success: false, error: 'Período inválido' }, { status: 400 });
        }

        // Buscar todas as contas
        const allAccounts = await getAllAdAccounts(accessToken);

        // Filtrar contas ativas (status 1) ou com restrict (3) que tiveram gasto
        const activeAccounts = allAccounts.filter(a => a.account_status === 1 || (a.account_status === 3 && Number(a.amount_spent) > 0));

        // Buscar insights de cada conta em paralelo (batch de 10)
        const batchSize = 10;
        const accountsWithInsights = [];

        for (let i = 0; i < activeAccounts.length; i += batchSize) {
            const batch = activeAccounts.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(async (account) => {
                    const insights = await getAccountInsights(account.id, accessToken, datePreset);
                    const spend = insights ? Number(insights.spend || 0) : 0;
                    const impressions = insights ? Number(insights.impressions || 0) : 0;
                    const clicks = insights ? Number(insights.clicks || 0) : 0;
                    const ctr = insights ? Number(insights.ctr || 0) : 0;
                    const cpc = insights ? Number(insights.cpc || 0) : 0;
                    const reach = insights ? Number(insights.reach || 0) : 0;
                    const frequency = insights ? Number(insights.frequency || 0) : 0;
                    const leads = insights ? getActionValue(insights.actions, 'lead') : 0;
                    const purchases = insights ? getActionValue(insights.actions, 'purchase') : 0;
                    const messaging = insights ? getActionValue(insights.actions, 'onsite_conversion.messaging_conversation_started_7d') : 0;

                    return {
                        id: account.id,
                        account_id: account.account_id,
                        name: account.name,
                        currency: account.currency,
                        account_status: account.account_status,
                        spend,
                        impressions,
                        clicks,
                        ctr,
                        cpc,
                        reach,
                        frequency,
                        leads,
                        purchases,
                        messaging,
                        total_spent_lifetime: Number(account.amount_spent) / 100,
                    };
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    accountsWithInsights.push(result.value);
                }
            }
        }

        // Ordenar por spend desc
        accountsWithInsights.sort((a, b) => b.spend - a.spend);

        return NextResponse.json({ success: true, data: accountsWithInsights, period: datePreset });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao buscar contas' },
            { status: 500 }
        );
    }
}
