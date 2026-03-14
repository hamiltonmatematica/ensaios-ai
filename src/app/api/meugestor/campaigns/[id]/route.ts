import { NextRequest, NextResponse } from 'next/server';
import { getAdsInsights, getDailyInsights, getActionValue, MetaDatePreset } from '@/lib/facebook';

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

        // Buscar anúncios e insights diários em paralelo (daily da campanha)
        const [ads, daily] = await Promise.all([
            getAdsInsights(id, accessToken, datePreset),
            getDailyInsights(id, accessToken, datePreset),
        ]);

        // Formatar anúncios
        const formattedAds = ads.map((a: any) => ({
            ad_id: a.ad_id,
            ad_name: a.ad_name,
            spend: Number(a.spend || 0),
            impressions: Number(a.impressions || 0),
            clicks: Number(a.clicks || 0),
            ctr: Number(a.ctr || 0),
            cpc: Number(a.cpc || 0),
            reach: Number(a.reach || 0),
            frequency: Number(a.frequency || 0),
            leads: getActionValue(a.actions, 'lead'),
            purchases: getActionValue(a.actions, 'purchase'),
            messaging: getActionValue(a.actions, 'onsite_conversion.messaging_conversation_started_7d'),
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

        // Ordenar anúncios por spend
        formattedAds.sort((a: any, b: any) => b.spend - a.spend);

        return NextResponse.json({
            success: true,
            data: {
                ads: formattedAds,
                daily: formattedDaily,
            }
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao buscar dados da campanha' },
            { status: 500 }
        );
    }
}
