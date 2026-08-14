import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAdsCreds, listAccessibleCustomers } from '@/lib/google-ads';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const creds = getGoogleAdsCreds(request);
        if (!creds) {
            return NextResponse.json(
                { success: false, error: 'Client ID, Client Secret, Developer Token e Refresh Token são obrigatórios.' },
                { status: 400 }
            );
        }

        const customerIds = await listAccessibleCustomers(creds);

        return NextResponse.json({
            success: true,
            data: { accessibleCustomerIds: customerIds },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro desconhecido ao acessar a API do Google Ads' },
            { status: 500 }
        );
    }
}
