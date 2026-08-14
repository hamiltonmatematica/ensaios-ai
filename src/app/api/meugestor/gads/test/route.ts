import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAdsCreds, fetchGoogleAdsSheet } from '@/lib/google-ads';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const creds = getGoogleAdsCreds(request);
        if (!creds) {
            return NextResponse.json(
                { success: false, error: 'Cole a URL do CSV publicado da planilha.' },
                { status: 400 }
            );
        }

        const rows = await fetchGoogleAdsSheet(creds);
        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'A planilha respondeu, mas está vazia. Rode o Google Ads Script manualmente uma vez e confira a aba "dados".' },
                { status: 400 }
            );
        }

        const accountIds = Array.from(new Set(rows.map(r => r.accountId)));
        const dates = rows.map(r => r.date).sort();

        return NextResponse.json({
            success: true,
            data: {
                rowCount: rows.length,
                accountCount: accountIds.length,
                accountNames: accountIds.map(id => rows.find(r => r.accountId === id)?.accountName || id),
                dateFrom: dates[0],
                dateTo: dates[dates.length - 1],
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro desconhecido ao ler a planilha do Google Ads' },
            { status: 500 }
        );
    }
}
