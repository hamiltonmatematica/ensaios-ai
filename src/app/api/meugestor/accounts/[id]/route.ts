import { NextRequest, NextResponse } from 'next/server';
import { getCampaignsInsights, getDailyInsights, getActionValue, MetaDatePreset } from '@/lib/facebook';

const VALID_PRESETS: MetaDatePreset[] = ['today', 'yesterday', 'last_3d', 'last_7d', 'last_14d', 'last_28d', 'last_30d', 'this_month', 'last_month'];

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const accessToken = process.env.META_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN não configurado' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const datePreset = (searchParams.get('period') || 'last_7d') as MetaDatePreset;
        if (!VALID_PRESETS.includes(datePreset)) {
            return NextResponse.json({ success: false, error: 'Período inválido' }, { status: 400 });
        }

        const accountId = id.startsWith('act_') ? id : `act_${id}`;

        // Buscar campanhas e insights diários em paralelo
        const [campaigns, daily] = await Promise.all([
            getCampaignsInsights(accountId, accessToken, datePreset),
            getDailyInsights(accountId, accessToken, datePreset),
        ]);

        // Formatar campanhas
        const formattedCampaigns = campaigns.map(c => ({
            campaign_id: c.campaign_id,
            campaign_name: c.campaign_name,
            spend: Number(c.spend || 0),
            impressions: Number(c.impressions || 0),
            clicks: Number(c.clicks || 0),
            ctr: Number(c.ctr || 0),
            cpc: Number(c.cpc || 0),
            reach: Number(c.reach || 0),
            frequency: Number(c.frequency || 0),
            leads: getActionValue(c.actions, 'lead'),
            purchases: getActionValue(c.actions, 'purchase'),
            messaging: getActionValue(c.actions, 'onsite_conversion.messaging_conversation_started_7d'),
        }));

        // Formatar insights diários
        const formattedDaily = daily.map(d => ({
            date: d.date_start,
            spend: Number(d.spend || 0),
            impressions: Number(d.impressions || 0),
            clicks: Number(d.clicks || 0),
            reach: Number(d.reach || 0),
            leads: getActionValue(d.actions, 'lead'),
            messaging: getActionValue(d.actions, 'onsite_conversion.messaging_conversation_started_7d'),
        }));

        // Ordenar campanhas por spend
        formattedCampaigns.sort((a, b) => b.spend - a.spend);

        return NextResponse.json({
            success: true,
            data: {
                campaigns: formattedCampaigns,
                daily: formattedDaily,
            }
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao buscar detalhes' },
            { status: 500 }
        );
    }
}
