/**
 * Google Ads — leitura via API oficial (OAuth2 + Developer Token), Meu Gestor v3.
 *
 * Diferente de src/lib/google-ads.ts (planilha exportada por Google Ads
 * Script, sem OAuth), este módulo fala direto com a API do Google Ads.
 * Existe pra resolver o problema que travou a primeira tentativa: um único
 * login-customer-id não funciona pra contas espalhadas em sub-MCCs
 * diferentes. Aqui, ao conectar, resolvemos a hierarquia inteira uma vez
 * (customer_client) e guardamos o login-customer-id certo por conta.
 *
 * Credenciais do APP (Client ID/Secret/Developer Token) ficam em variáveis
 * de ambiente do servidor — nunca no navegador, ao contrário da versão
 * anterior. O refresh token do usuário fica no banco (GoogleAdsConnection),
 * uma linha só (ferramenta de operador único, sem sessão/login).
 *
 * Requer que o app OAuth do ensaios.ai esteja verificado pelo Google (escopo
 * adwords é "sensível") e que o developer token tenha acesso Básico ou
 * superior — sem isso, a conexão funciona mas só enxerga contas de teste.
 */

import { prisma } from '@/lib/prisma';

const GOOGLE_ADS_API_VERSION = 'v25';
const GOOGLE_ADS_API_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CONNECTION_ID = 'google-ads-connection';

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Variável de ambiente ${name} não configurada.`);
    return v;
}

// ─────────────────────────────────────────────────────────────
// OAUTH: troca de code / refresh token por access token
// ─────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ access_token: string; refresh_token: string }> {
    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: requireEnv('GOOGLE_ADS_OAUTH_CLIENT_ID'),
            client_secret: requireEnv('GOOGLE_ADS_OAUTH_CLIENT_SECRET'),
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.error || `Falha ao trocar code por token (HTTP ${res.status})`);
    if (!data.refresh_token) throw new Error('Google não retornou refresh_token — revogue o acesso em myaccount.google.com/permissions e tente de novo (prompt=consent deveria evitar isso).');
    return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function getAccessTokenFromRefresh(refreshToken: string): Promise<string> {
    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: requireEnv('GOOGLE_ADS_OAUTH_CLIENT_ID'),
            client_secret: requireEnv('GOOGLE_ADS_OAUTH_CLIENT_SECRET'),
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.error || `Falha ao renovar access token (HTTP ${res.status})`);
    return data.access_token;
}

function buildHeaders(accessToken: string, loginCustomerId?: string): HeadersInit {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': requireEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
        'Content-Type': 'application/json',
    };
    if (loginCustomerId) headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
    return headers;
}

export async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
    const res = await fetch(`${GOOGLE_ADS_API_URL}/customers:listAccessibleCustomers`, { headers: buildHeaders(accessToken) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data));
    const resourceNames: string[] = data.resourceNames || [];
    return resourceNames.map(rn => rn.replace('customers/', ''));
}

async function gaqlSearchRaw(accessToken: string, customerId: string, loginCustomerId: string | undefined, query: string): Promise<any[]> {
    const res = await fetch(`${GOOGLE_ADS_API_URL}/customers/${customerId}/googleAds:search`, {
        method: 'POST',
        headers: buildHeaders(accessToken, loginCustomerId),
        body: JSON.stringify({ query }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data));
    return data.results || [];
}

// ─────────────────────────────────────────────────────────────
// RESOLUÇÃO DE HIERARQUIA (o que travou a tentativa anterior)
// ─────────────────────────────────────────────────────────────

/**
 * Pra cada customer ID diretamente acessível pelo refresh token, tenta
 * andar a árvore de customer_client (só existe em contas gerenciadoras).
 * Cada conta FOLHA (manager=false) encontrada vira uma entrada no mapa
 * apontando pro topo que a alcançou — esse é o login-customer-id certo
 * pra consultar aquela conta especificamente.
 */
export async function resolveAccountHierarchy(accessToken: string): Promise<Record<string, string>> {
    const topLevelIds = await listAccessibleCustomers(accessToken);
    const map: Record<string, string> = {};

    for (const topId of topLevelIds) {
        try {
            const rows = await gaqlSearchRaw(accessToken, topId, topId, `
                SELECT customer_client.id, customer_client.manager, customer_client.level
                FROM customer_client
                WHERE customer_client.level <= 10
            `);
            let foundAny = false;
            for (const row of rows) {
                const childId = String(row.customerClient?.id ?? '');
                if (!childId) continue;
                foundAny = true;
                if (row.customerClient?.manager) continue; // só interessa quem é folha/consultável
                if (!(childId in map)) map[childId] = topId;
            }
            if (!foundAny && !(topId in map)) map[topId] = topId;
        } catch {
            // topId não é gerenciadora (não tem customer_client) — conta direta, login-customer-id = ela mesma
            if (!(topId in map)) map[topId] = topId;
        }
    }
    return map;
}

// ─────────────────────────────────────────────────────────────
// CONEXÃO ARMAZENADA
// ─────────────────────────────────────────────────────────────

export interface StoredConnection {
    refreshToken: string;
    loginCustomerIds: Record<string, string>;
}

export async function saveConnection(refreshToken: string, loginCustomerIds: Record<string, string>, connectedEmail?: string) {
    await prisma.googleAdsConnection.upsert({
        where: { id: CONNECTION_ID },
        create: { id: CONNECTION_ID, refreshToken, loginCustomerIds, connectedEmail },
        update: { refreshToken, loginCustomerIds, connectedEmail },
    });
}

export async function getStoredConnection(): Promise<StoredConnection | null> {
    const row = await prisma.googleAdsConnection.findUnique({ where: { id: CONNECTION_ID } });
    if (!row) return null;
    return { refreshToken: row.refreshToken, loginCustomerIds: row.loginCustomerIds as Record<string, string> };
}

export async function clearConnection() {
    await prisma.googleAdsConnection.deleteMany({ where: { id: CONNECTION_ID } });
}

/** Roda uma query GAQL contra uma conta específica, já usando o login-customer-id certo. */
export async function gaqlSearchForAccount(customerId: string, query: string): Promise<any[]> {
    const conn = await getStoredConnection();
    if (!conn) throw new Error('Google Ads não conectado. Clique em "Conectar Google Ads" no meugestor.');
    const accessToken = await getAccessTokenFromRefresh(conn.refreshToken);
    const loginCustomerId = conn.loginCustomerIds[customerId] || customerId;
    return gaqlSearchRaw(accessToken, customerId, loginCustomerId, query);
}

/** Testa a conexão: renova o token e lista as contas acessíveis (sem precisar de dev token Básico pra isso). */
export async function testConnection(): Promise<{ accessibleCustomerIds: string[]; resolvedAccounts: string[] }> {
    const conn = await getStoredConnection();
    if (!conn) throw new Error('Google Ads não conectado.');
    const accessToken = await getAccessTokenFromRefresh(conn.refreshToken);
    const accessibleCustomerIds = await listAccessibleCustomers(accessToken);
    return { accessibleCustomerIds, resolvedAccounts: Object.keys(conn.loginCustomerIds) };
}
