import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAdsCreds, listGoogleAdsAccountRows } from '@/lib/google-ads';
import { presetToRange, previousRange, MetaDatePreset, MetaTimeRange } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

const VALID_PRESETS: MetaDatePreset[] = [
    'today', 'yesterday',
    'last_3d', 'last_7d', 'last_14d', 'last_28d', 'last_30d', 'last_90d',
    'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year',
];

export async function GET(request: NextRequest) {
    try {
        const creds = getGoogleAdsCreds(request);
        if (!creds) {
            return NextResponse.json({ success: false, error: 'Nenhuma URL de planilha do Google Ads configurada.' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const preset = (searchParams.get('period') || 'last_7d') as MetaDatePreset;
        const since = searchParams.get('since');
        const until = searchParams.get('until');
        const compare = searchParams.get('compare') !== 'false';

        let range: MetaTimeRange;
        if (since && until) {
            range = { since, until };
        } else {
            if (!VALID_PRESETS.includes(preset)) {
                return NextResponse.json({ success: false, error: 'Período inválido' }, { status: 400 });
            }
            range = presetToRange(preset);
        }
        const prev = compare ? previousRange(range) : null;

        const { rows, errors } = await listGoogleAdsAccountRows(creds, range, prev);

        return NextResponse.json({
            success: true,
            data: rows,
            // Erros parciais (ex: uma das planilhas de MCC falhou, mas as outras vieram) —
            // não bloqueiam a resposta, o frontend decide como avisar o usuário.
            partialErrors: errors.length ? errors : undefined,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao buscar contas do Google Ads' },
            { status: 500 }
        );
    }
}
