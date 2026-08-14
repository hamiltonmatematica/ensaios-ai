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
 */
export async function listAccessibleCustomers(creds: GoogleAdsCreds): Promise<string[]> {
    const accessToken = await getGoogleAdsAccessToken(creds);
    const res = await fetch(`${GOOGLE_ADS_API_URL}/customers:listAccessibleCustomers`, {
        headers: buildHeaders(accessToken, creds),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message || JSON.stringify(data);
        throw new Error(msg);
    }
    const resourceNames: string[] = data.resourceNames || [];
    return resourceNames.map(rn => rn.replace('customers/', ''));
}

/** Executa uma query GAQL contra um customer específico (base para relatórios/insights). */
export async function gaqlSearch(creds: GoogleAdsCreds, customerId: string, query: string): Promise<any[]> {
    const accessToken = await getGoogleAdsAccessToken(creds);
    const cleanCustomerId = customerId.replace(/-/g, '');
    const res = await fetch(`${GOOGLE_ADS_API_URL}/customers/${cleanCustomerId}/googleAds:search`, {
        method: 'POST',
        headers: buildHeaders(accessToken, creds),
        body: JSON.stringify({ query }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message || JSON.stringify(data);
        throw new Error(msg);
    }
    return data.results || [];
}
