import { NextResponse } from 'next/server';
import { getStoredConnection, testConnection, clearConnection } from '@/lib/google-ads-oauth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const conn = await getStoredConnection();
        if (!conn) {
            return NextResponse.json({ success: true, data: { connected: false } });
        }
        const result = await testConnection();
        return NextResponse.json({
            success: true,
            data: {
                connected: true,
                accessibleCustomerIds: result.accessibleCustomerIds,
                resolvedAccounts: result.resolvedAccounts,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Erro ao checar conexão' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        await clearConnection();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Erro ao desconectar' }, { status: 500 });
    }
}
