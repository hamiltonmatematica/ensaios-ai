/**
 * Google Ads API Helper — Meu Gestor v3
 *
 * Foco: leitura de relatórios/métricas (sem escrita/gestão, ao contrário do
 * lib/facebook.ts). Credenciais chegam via headers x-google-ads-* enviados
 * pelo frontend (localStorage), nunca de variáveis de ambiente do servidor.
 */

import { NextRequest } from 'next/server';

const GOOGLE_ADS_API_VERSION = 'v25';
const GOOGLE_ADS_API_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleAdsCreds {
    clientId: string;
    clientSecret: string;
    developerToken: string;
    refreshToken: string;
    loginCustomerId: string;
    customerId: string;
}

/** Lê as credenciais dos headers x-google-ads-* enviados pelo cliente. Retorna null se faltar algo essencial. */
export function getGoogleAdsCreds(request: NextRequest): GoogleAdsCreds | null {
    const h = request.headers;
    const creds: GoogleAdsCreds = {
        clientId: (h.get('x-google-ads-client-id') || '').trim(),
        clientSecret: (h.get('x-google-ads-client-secret') || '').trim(),
        developerToken: (h.get('x-google-ads-developer-token') || '').trim(),
        refreshToken: (h.get('x-google-ads-refresh-token') || '').trim(),
        loginCustomerId: (h.get('x-google-ads-login-customer-id') || '').replace(/-/g, '').trim(),
        customerId: (h.get('x-google-ads-customer-id') || '').replace(/-/g, '').trim(),
    };
    if (!creds.clientId || !creds.clientSecret || !creds.developerToken || !creds.refreshToken) return null;
    return creds;
}

/** Troca o refresh token por um access token novo (válido por ~1h). */
export async function getGoogleAdsAccessToken(creds: GoogleAdsCreds): Promise<string> {
    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            refresh_token: creds.refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error_description || data.error || `Falha ao renovar access token (HTTP ${res.status})`);
    }
    if (!data.access_token) throw new Error('Resposta do Google sem access_token');
    return data.access_token as string;
}

function buildHeaders(accessToken: string, creds: GoogleAdsCreds): HeadersInit {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': creds.developerToken,
        'Content-Type': 'application/json',
    };
    if (creds.loginCustomerId) headers['login-customer-id'] = creds.loginCustomerId;
    return headers;
}

/**
 * Lista os customer IDs acessíveis pelo refresh token — chamada mais simples
 * da API, ideal para validar se Client ID/Secret + Developer Token + Refresh
 * Token estão corretos, sem precisar de um Customer ID específico.
 * Aceita um access token já obtido para evitar renovar de novo (ex: quando
 * chamada em sequência com outras consultas na mesma requisição).
 */
export async function listAccessibleCustomers(creds: GoogleAdsCreds, accessToken?: string): Promise<string[]> {
    const token = accessToken || await getGoogleAdsAccessToken(creds);
    const res = await fetch(`${GOOGLE_ADS_API_URL}/customers:listAccessibleCustomers`, {
        headers: buildHeaders(token, creds),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message || JSON.stringify(data);
        throw new Error(msg);
    }
    const resourceNames: string[] = data.resourceNames || [];
    return resourceNames.map(rn => rn.replace('customers/', ''));
}

/**
 * Executa uma query GAQL contra um customer específico (base para relatórios/insights).
 * Aceita um access token já obtido (ver listAccessibleCustomers) pelo mesmo motivo.
 */
export async function gaqlSearch(creds: GoogleAdsCreds, customerId: string, query: string, accessToken?: string): Promise<any[]> {
    const token = accessToken || await getGoogleAdsAccessToken(creds);
    const cleanCustomerId = customerId.replace(/-/g, '');
    const res = await fetch(`${GOOGLE_ADS_API_URL}/customers/${cleanCustomerId}/googleAds:search`, {
        method: 'POST',
        headers: buildHeaders(token, creds),
        body: JSON.stringify({ query }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message || JSON.stringify(data);
        throw new Error(msg);
    }
    return data.results || [];
}

// ─────────────────────────────────────────────────────────────
// MÉTRICAS DE CONTA (leitura/relatórios)
// ─────────────────────────────────────────────────────────────

export interface DateRange { since: string; until: string; }

interface RawCustomerMetrics {
    customerId: string;
    name: string;
    currency: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionsValue: number;
}

/** Totais da conta (customer) num período — 1 linha agregada via GAQL (sem segments.date no SELECT). */
async function getCustomerMetrics(creds: GoogleAdsCreds, customerId: string, range: DateRange, accessToken: string): Promise<RawCustomerMetrics> {
    const query = `
        SELECT
          customer.descriptive_name,
          customer.currency_code,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.conversions_value
        FROM customer
        WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'
    `;
    const results = await gaqlSearch(creds, customerId, query, accessToken);
    const row = results[0];
    return {
        customerId,
        name: row?.customer?.descriptiveName || customerId,
        currency: row?.customer?.currencyCode || 'BRL',
        spend: Number(row?.metrics?.costMicros || 0) / 1_000_000,
        impressions: Number(row?.metrics?.impressions || 0),
        clicks: Number(row?.metrics?.clicks || 0),
        conversions: Number(row?.metrics?.conversions || 0),
        conversionsValue: Number(row?.metrics?.conversionsValue || 0),
    };
}

function deriveMetrics(m: RawCustomerMetrics) {
    const { spend, impressions, clicks, conversions } = m;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const leads = conversions;
    const cpl = leads > 0 ? spend / leads : 0;
    return { spend, impressions, clicks, ctr, cpc, cpm, leads, cpl };
}

function pctDelta(curr: number, prev: number): number | null {
    return prev > 0 ? ((curr - prev) / prev) * 100 : null;
}

/**
 * Monta as linhas de conta do Google Ads no mesmo formato usado pelas linhas
 * do Meta (spend/impressions/clicks/ctr/cpc/cpm/leads/cpl/previous/deltas),
 * para poderem ser exibidas juntas na mesma InsightsTable do dashboard.
 * Sem escrita/gestão — só os números do período (foco em relatório).
 */
const BATCH_SIZE = 5;

export async function listGoogleAdsAccountRows(
    creds: GoogleAdsCreds,
    range: DateRange,
    prevRange: DateRange | null,
): Promise<any[]> {
    // Um único access token pra toda a requisição — evita disparar dezenas de
    // renovações simultâneas (uma por conta x período), que o Google costuma
    // recusar com um erro de autenticação genérico quando em rajada.
    const accessToken = await getGoogleAdsAccessToken(creds);

    let customerIds: string[];
    if (creds.customerId) {
        customerIds = [creds.customerId];
    } else {
        try {
            customerIds = await listAccessibleCustomers(creds, accessToken);
        } catch (e: any) {
            throw new Error(`Falha ao listar contas acessíveis: ${e.message}`);
        }
    }

    const fulfilled: any[] = [];
    const rejections: any[] = [];

    for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
        const batch = customerIds.slice(i, i + BATCH_SIZE);
        const settled = await Promise.allSettled(batch.map(async (customerId) => {
            let currRaw: RawCustomerMetrics, prevRaw: RawCustomerMetrics | null;
            try {
                [currRaw, prevRaw] = await Promise.all([
                    getCustomerMetrics(creds, customerId, range, accessToken),
                    prevRange ? getCustomerMetrics(creds, customerId, prevRange, accessToken).catch(() => null) : Promise.resolve(null),
                ]);
            } catch (e: any) {
                throw new Error(`Conta ${customerId}: ${e.message}`);
            }
            const curr = deriveMetrics(currRaw);
            const prev = prevRaw ? deriveMetrics(prevRaw) : null;

            const deltas = prev ? {
                spend: pctDelta(curr.spend, prev.spend),
                impressions: pctDelta(curr.impressions, prev.impressions),
                clicks: pctDelta(curr.clicks, prev.clicks),
                ctr: pctDelta(curr.ctr, prev.ctr),
                cpc: pctDelta(curr.cpc, prev.cpc),
                cpm: pctDelta(curr.cpm, prev.cpm),
                leads: pctDelta(curr.leads, prev.leads),
                cpl: pctDelta(curr.cpl, prev.cpl),
            } : null;

            return {
                id: `google:${customerId}`,
                source: 'google',
                name: currRaw.name,
                account_id: customerId,
                currency: currRaw.currency,
                ...curr,
                purchases: 0, purchase_value: 0, roas: 0, messaging_started: 0, reach: 0, frequency: 0,
                has_any_ads: curr.spend > 0 || curr.impressions > 0,
                has_ads_in_period: curr.spend > 0,
                issues: [] as string[],
                issue_categories: [] as string[],
                previous: prev,
                deltas,
                health: undefined,
            };
        }));

        for (const r of settled) {
            if (r.status === 'fulfilled') fulfilled.push(r.value);
            else rejections.push(r.reason);
        }
    }

    // Se TODAS as contas falharam, é sinal de credencial/config quebrada — propaga o
    // erro real (com o id da conta) em vez de devolver uma lista vazia (que
    // pareceria "sem contas"). Mostra até 3 mensagens distintas para ajudar a
    // diagnosticar se é um problema sistêmico ou específico de algumas contas.
    if (fulfilled.length === 0 && customerIds.length > 0) {
        const messages = Array.from(new Set(rejections.map(r => (r instanceof Error ? r.message : String(r))))).slice(0, 3);
        throw new Error(messages.join(' | ') || 'Falha ao buscar contas do Google Ads');
    }

    return fulfilled;
}
