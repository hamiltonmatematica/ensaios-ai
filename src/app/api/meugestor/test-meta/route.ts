import { NextResponse } from 'next/server';
import { getAccountInsights, getCampaignsInsights, getDailyInsights } from '@/lib/facebook';

export async function GET() {
    try {
        const accessToken = process.env.META_ACCESS_TOKEN;
        let adAccountId = process.env.META_AD_ACCOUNT_ID;

        if (!accessToken || !adAccountId) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: "As variáveis de ambiente META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não estão configuradas." 
                },
                { status: 400 }
            );
        }

        // Garante que o account ID tenha o prefixo act_ exigido pela meta
        if (!adAccountId.startsWith('act_')) {
            adAccountId = `act_${adAccountId}`;
        }

        // Busca dados da conta
        const accountData = await getAccountInsights(adAccountId, accessToken);

        if (!accountData) {
            return NextResponse.json(
                { success: false, error: "Conta não encontrada ou sem dados." },
                { status: 400 }
            );
        }

        // Busca campanhas e insights diários
        const campaigns = await getCampaignsInsights(adAccountId, accessToken);
        const dailyInsights = await getDailyInsights(adAccountId, accessToken);

        return NextResponse.json({
            success: true,
            data: {
                account: accountData,
                campaignsInsights: campaigns,
                dailyInsights: dailyInsights
            }
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Erro desconhecido ao acessar a API da Meta" },
            { status: 500 }
        );
    }
}
