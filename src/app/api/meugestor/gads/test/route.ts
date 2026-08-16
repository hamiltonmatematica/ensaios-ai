import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAdsCreds, fetchAllSheets } from '@/lib/google-ads';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const creds = getGoogleAdsCreds(request);
        if (!creds) {
            return NextResponse.json(
                { success: false, error: 'Cole ao menos uma URL de CSV publicado.' },
                { status: 400 }
            );
        }

        const results = await fetchAllSheets(creds);
        const allRows = results.flatMap(r => r.rows);

        if (allRows.length === 0) {
            const combined = results.map(r => r.error).filter(Boolean).join(' | ');
            return NextResponse.json(
                { success: false, error: combined || 'As planilhas responderam, mas estão vazias. Rode o Google Ads Script manualmente uma vez e confira a aba "dados".' },
                { status: 400 }
            );
        }

        const accountIds = Array.from(new Set(allRows.map(r => r.accountId)));
        const dates = allRows.map(r => r.date).sort();

        return NextResponse.json({
            success: true,
            data: {
                rowCount: allRows.length,
                accountCount: accountIds.length,
                accountNames: accountIds.map(id => allRows.find(r => r.accountId === id)?.accountName || id),
                dateFrom: dates[0],
                dateTo: dates[dates.length - 1],
                perSheet: results.map(r => ({
                    url: r.url,
                    rowCount: r.rows.length,
                    accountCount: new Set(r.rows.map(row => row.accountId)).size,
                    error: r.error,
                })),
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro desconhecido ao ler as planilhas do Google Ads' },
            { status: 500 }
        );
    }
}
