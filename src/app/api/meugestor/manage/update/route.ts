// Rota de edição rápida (nome, orçamento e status) de campanhas, conjuntos e anúncios Meta Ads
import { NextRequest, NextResponse } from 'next/server';
import { requireWriteToken, isNumericId } from '@/lib/meugestor-write-guard';
import { updateEntity } from '@/lib/facebook-manage';

const VALID_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'];

const badBudget = (v: unknown) => v !== undefined && (!Number.isInteger(v) || (v as number) <= 0);

export async function POST(request: NextRequest) {
    try {
        const auth = requireWriteToken(request);
        if (auth.response) return auth.response;
        const accessToken = auth.token;

        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ success: false, error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 });
        }

        const { id, fields } = body as {
            id?: string;
            fields?: { name?: string; dailyBudgetCents?: number; lifetimeBudgetCents?: number; status?: string };
        };

        if (!id || !isNumericId(String(id))) {
            return NextResponse.json({ success: false, error: 'id é obrigatório e deve ser o id numérico do objeto' }, { status: 400 });
        }
        if (!fields || typeof fields !== 'object') {
            return NextResponse.json({ success: false, error: 'fields é obrigatório' }, { status: 400 });
        }

        const cleaned: { name?: string; dailyBudgetCents?: number; lifetimeBudgetCents?: number; status?: string } = {};

        if (fields.name !== undefined) {
            if (typeof fields.name !== 'string' || !fields.name.trim()) {
                return NextResponse.json({ success: false, error: 'Nome inválido' }, { status: 400 });
            }
            cleaned.name = fields.name.trim();
        }
        if (fields.dailyBudgetCents !== undefined) {
            if (badBudget(fields.dailyBudgetCents)) {
                return NextResponse.json({ success: false, error: 'Orçamento diário inválido: informe centavos como número inteiro positivo' }, { status: 400 });
            }
            cleaned.dailyBudgetCents = fields.dailyBudgetCents;
        }
        if (fields.lifetimeBudgetCents !== undefined) {
            if (badBudget(fields.lifetimeBudgetCents)) {
                return NextResponse.json({ success: false, error: 'Orçamento total inválido: informe centavos como número inteiro positivo' }, { status: 400 });
            }
            cleaned.lifetimeBudgetCents = fields.lifetimeBudgetCents;
        }
        if (fields.status !== undefined) {
            if (!VALID_STATUSES.includes(fields.status)) {
                return NextResponse.json({ success: false, error: "Status inválido: use 'ACTIVE', 'PAUSED', 'ARCHIVED' ou 'DELETED'" }, { status: 400 });
            }
            cleaned.status = fields.status;
        }

        if (Object.keys(cleaned).length === 0) {
            return NextResponse.json({ success: false, error: 'Informe ao menos um campo para atualizar (name, dailyBudgetCents, lifetimeBudgetCents ou status)' }, { status: 400 });
        }

        const result = await updateEntity(accessToken, String(id), cleaned);

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        const isAuthError = error?.fb?.code === 190 || error?.code === 190 || error?.message?.includes('OAuth') || error?.message?.includes('access token');
        const status = isAuthError ? 401 : (error?.status || 500);
        const errorMsg = isAuthError
            ? 'Token de acesso da Meta (META_ACCESS_TOKEN) está inválido ou expirado.'
            : (error?.fb?.error_user_msg || error?.message || 'Erro ao atualizar item');

        return NextResponse.json(
            { success: false, error: errorMsg, code: error?.fb?.code || error?.code },
            { status }
        );
    }
}
