// Guard das rotas de ESCRITA do meugestor: exige token explícito via header
// x-meta-access-token (sem fallback para META_ACCESS_TOKEN do servidor — evita
// gasto/mutação anônima num deploy público) e bloqueia requisições cross-site.
import { NextRequest, NextResponse } from 'next/server';

export function requireWriteToken(
    request: NextRequest,
    opts: { requireJson?: boolean } = {},
): { token: string; response?: undefined } | { token?: undefined; response: NextResponse } {
    // Anti-CSRF: se o navegador enviou Origin, precisa ser a mesma origem do app
    const origin = request.headers.get('origin');
    if (origin) {
        let originHost: string | null = null;
        try { originHost = new URL(origin).host; } catch { originHost = null; }
        const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
        if (!originHost || !requestHost || originHost !== requestHost) {
            return { response: NextResponse.json({ success: false, error: 'Origem da requisição não autorizada' }, { status: 403 }) };
        }
    }

    // Exige JSON de verdade: bloqueia envio cross-site com text/plain (sem preflight CORS)
    if (opts.requireJson !== false) {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return { response: NextResponse.json({ success: false, error: 'Content-Type deve ser application/json' }, { status: 415 }) };
        }
    }

    const token = request.headers.get('x-meta-access-token')?.trim() || null;
    if (!token) {
        return { response: NextResponse.json({ success: false, error: 'Token da Meta é obrigatório para operações de escrita: configure o token no botão "Token Meta" da tela' }, { status: 401 }) };
    }
    return { token };
}

/** Id numérico do Graph (evita injeção de caminho/query em `${id}/...`). */
export const isNumericId = (v: unknown): v is string => typeof v === 'string' && /^\d{1,25}$/.test(v);
