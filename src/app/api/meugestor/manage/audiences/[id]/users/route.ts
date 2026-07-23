// Adiciona usuários (emails/telefones) a um público personalizado — hashing SHA-256 feito no servidor.
import { NextRequest, NextResponse } from 'next/server';
import { requireWriteToken, isNumericId } from '@/lib/meugestor-write-guard';
import { addUsersToAudience } from '@/lib/facebook-manage';

const MAX_ENTRIES = 100000;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!isNumericId(id)) {
            return NextResponse.json({ success: false, error: 'id do público inválido' }, { status: 400 });
        }
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json();
        const emails: unknown = body?.emails;
        const phones: unknown = body?.phones;

        if ((emails !== undefined && !Array.isArray(emails)) || (phones !== undefined && !Array.isArray(phones))) {
            return NextResponse.json({ success: false, error: 'emails e phones devem ser listas de texto' }, { status: 400 });
        }

        const emailList = (emails as string[] | undefined) || [];
        const phoneList = (phones as string[] | undefined) || [];
        const total = emailList.length + phoneList.length;

        if (total === 0) {
            return NextResponse.json({ success: false, error: 'Informe ao menos um email ou telefone' }, { status: 400 });
        }
        if (total > MAX_ENTRIES) {
            return NextResponse.json(
                { success: false, error: `Máximo de ${MAX_ENTRIES.toLocaleString('pt-BR')} registros por requisição (recebidos: ${total.toLocaleString('pt-BR')})` },
                { status: 400 }
            );
        }

        const data = await addUsersToAudience(accessToken, id, {
            ...(emailList.length ? { emails: emailList } : {}),
            ...(phoneList.length ? { phones: phoneList } : {}),
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190
            || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        return NextResponse.json(
            {
                success: false,
                error: error?.fb?.error_user_msg || error?.message || 'Erro ao adicionar usuários ao público',
                code: error?.fb?.code || error?.code,
            },
            { status: isAuthError ? 401 : (error?.status || 500) }
        );
    }
}
