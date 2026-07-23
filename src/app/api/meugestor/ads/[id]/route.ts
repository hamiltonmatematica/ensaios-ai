import { NextRequest, NextResponse } from 'next/server';
import { getAdCreative, getMetaAccessToken } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const accessToken = getMetaAccessToken(request);
        if (!accessToken) {
            return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN não configurado' }, { status: 400 });
        }
        const creative = await getAdCreative(id, accessToken);
        if (!creative) return NextResponse.json({ success: false, error: 'Anúncio não encontrado' }, { status: 404 });
        return NextResponse.json({ success: true, data: creative });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
