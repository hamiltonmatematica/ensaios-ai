/**
 * Facebook Marketing API Helper
 * Acesso direto à API da Meta para todas as contas gerenciadas.
 */

const FB_GRAPH_URL = 'https://graph.facebook.com/v22.0';

// Presets de data aceitos pela Meta API
export type MetaDatePreset = 'today' | 'yesterday' | 'last_3d' | 'last_7d' | 'last_14d' | 'last_28d' | 'last_30d' | 'this_month' | 'last_month';

export interface MetaAccount {
    id: string;
    name: string;
    account_id: string;
    currency: string;
    account_status: number;
    amount_spent: string;
}

export interface MetaCampaignInsight {
    campaign_id: string;
    campaign_name: string;
    spend: string;
    impressions: string;
    clicks: string;
    ctr: string;
    cpc: string;
    reach: string;
    frequency: string;
    actions?: Array<{ action_type: string; value: string }>;
    date_start: string;
    date_stop: string;
}

export interface MetaDailyInsight {
    date_start: string;
    date_stop: string;
    spend: string;
    impressions: string;
    clicks: string;
    reach: string;
    actions?: Array<{ action_type: string; value: string }>;
}

/**
 * Retorna todas as contas de anúncio acessíveis pelo token
 */
export async function getAllAdAccounts(accessToken: string): Promise<MetaAccount[]> {
    const allAccounts: MetaAccount[] = [];
    let url: string | null = `${FB_GRAPH_URL}/me/adaccounts?fields=name,account_id,currency,account_status,amount_spent&limit=100&access_token=${accessToken}`;

    while (url) {
        const res: Response = await fetch(url as string);
        const data: any = await res.json();
        if (data.error) throw new Error(data.error.message);
        if (data.data) allAccounts.push(...data.data);
        url = data.paging?.next || null;
    }

    return allAccounts;
}

/**
 * Busca insights por campanha de uma conta
 */
export async function getCampaignsInsights(adAccountId: string, accessToken: string, datePreset: MetaDatePreset = 'last_7d'): Promise<MetaCampaignInsight[]> {
    const url = `${FB_GRAPH_URL}/${adAccountId}/insights?` +
        `level=campaign&` +
        `date_preset=${datePreset}&` +
        `fields=campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,reach,frequency,actions&` +
        `limit=500&` +
        `access_token=${accessToken}`;

    const res: Response = await fetch(url);
    const data: any = await res.json();
    if (data.error) return [];
    return data.data || [];
}

/**
 * Busca insights agregados de uma conta
 */
export async function getAccountInsights(adAccountId: string, accessToken: string, datePreset: MetaDatePreset = 'last_7d') {
    const url = `${FB_GRAPH_URL}/${adAccountId}/insights?` +
        `date_preset=${datePreset}&` +
        `fields=spend,impressions,clicks,ctr,cpc,reach,frequency,actions&` +
        `access_token=${accessToken}`;

    const res: Response = await fetch(url);
    const data: any = await res.json();
    if (data.error) return null;
    return data.data?.[0] || null;
}

/**
 * Busca insights diários de uma conta
 */
export async function getDailyInsights(adAccountId: string, accessToken: string, datePreset: MetaDatePreset = 'last_7d'): Promise<MetaDailyInsight[]> {
    const url = `${FB_GRAPH_URL}/${adAccountId}/insights?` +
        `time_increment=1&` +
        `date_preset=${datePreset}&` +
        `fields=date_start,spend,impressions,clicks,reach,actions&` +
        `access_token=${accessToken}`;

    const res: Response = await fetch(url);
    const data: any = await res.json();
    if (data.error) return [];
    return data.data || [];
}

/**
 * Extrai o valor de uma action específica do array de actions da Meta
 */
export function getActionValue(actions: Array<{ action_type: string; value: string }> | undefined, actionType: string): number {
    if (!actions) return 0;
    const action = actions.find(a => a.action_type === actionType);
    return action ? Number(action.value) : 0;
}

/**
 * Busca insights por anúncio de uma campanha (nível ad)
 */
export async function getAdsInsights(campaignId: string, accessToken: string, datePreset: MetaDatePreset = 'last_7d') {
    const url = `${FB_GRAPH_URL}/${campaignId}/insights?` +
        `level=ad&` +
        `date_preset=${datePreset}&` +
        `fields=ad_id,ad_name,spend,impressions,clicks,ctr,cpc,reach,frequency,actions&` +
        `limit=500&` +
        `access_token=${accessToken}`;

    const res: Response = await fetch(url);
    const data: any = await res.json();
    if (data.error) return [];
    return data.data || [];
}
