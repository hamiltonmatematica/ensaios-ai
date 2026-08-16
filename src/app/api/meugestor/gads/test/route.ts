import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAdsCreds, fetchAllCsv, fetchAccountSheet, fetchCampaignSheet, DailyRow, CampaignDailyRow } from '@/lib/google-ads';

export const dynamic = 'force-dynamic';

function summarize(rows: (DailyRow | CampaignDailyRow)[]) {
    const accountIds = Array.from(new Set(rows.map(r => r.accountId)));
    const dates = rows.map(r => r.date).sort();
    return {
        rowCount: rows.length,
        accountCount: accountIds.length,
        dateFrom: dates[0] || null,
        dateTo: dates[dates.length - 1] || null,
    };
}

export async function GET(request: NextRequest) {
    try {
        const creds = getGoogleAdsCreds(request);
        if (!creds) {
            return NextResponse.json(
                { success: false, error: 'Cole ao menos uma URL de CSV publicado (contas ou campanhas).' },
                { status: 400 }
            );
        }

        const [accountResults, campaignResults] = await Promise.all([
            fetchAllCsv(creds.sheetCsvUrls, fetchAccountSheet),
            fetchAllCsv(creds.campaignSheetCsvUrls, fetchCampaignSheet),
        ]);

        const allAccountRows = accountResults.flatMap(r => r.rows);
        const allCampaignRows = campaignResults.flatMap(r => r.rows);

        if (allAccountRows.length === 0 && allCampaignRows.length === 0) {
            const combined = [...accountResults, ...campaignResults].map(r => r.error).filter(Boolean).join(' | ');
            return NextResponse.json(
                { success: false, error: combined || 'As planilhas responderam, mas estão vazias. Rode o Google Ads Script manualmente uma vez.' },
                { status: 400 }
            );
        }

        const accountNames = Array.from(new Set(allAccountRows.map(r => r.accountId)))
            .map(id => allAccountRows.find(r => r.accountId === id)?.accountName || id);

        return NextResponse.json({
            success: true,
            data: {
                accounts: {
                    ...summarize(allAccountRows),
                    accountNames,
                    perSheet: accountResults.map(r => ({ url: r.url, ...summarize(r.rows), error: r.error })),
                },
                campaigns: {
                    ...summarize(allCampaignRows),
                    perSheet: campaignResults.map(r => ({ url: r.url, ...summarize(r.rows), error: r.error })),
                },
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro desconhecido ao ler as planilhas do Google Ads' },
            { status: 500 }
        );
    }
}
