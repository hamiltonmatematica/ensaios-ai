/**
 * Google Ads — leitura via planilha exportada (Meu Gestor v3)
 *
 * Arquitetura simplificada: em vez de OAuth2 + Developer Token + API do
 * Google Ads (que exige aprovação do Google, projeto no Cloud, e mapear a
 * hierarquia do MCC pra cada conta), um Google Ads Script roda DENTRO da
 * conta do usuário (sem nenhuma credencial nossa) e exporta métricas diárias
 * de todas as contas gerenciadas para uma Google Sheets publicada como CSV.
 * Este módulo só baixa e agrega esse CSV — sem escrita/gestão, foco 100% em
 * relatório/métricas. Ver scripts/google-ads-export.gs e GOOGLE_ADS_SETUP.md.
 *
 * Duas camadas de dados, cada uma com sua(s) planilha(s) por MCC:
 *  - "dados" (sheetCsvUrls): 1 linha por conta por dia, histórico longo.
 *  - "campanhas" (campaignSheetCsvUrls): 1 linha por grupo de anúncios por
 *    dia, histórico mais curto — base do drill-down conta > campanha > grupo.
 */

import { NextRequest } from 'next/server';

export interface GoogleAdsCreds {
    sheetCsvUrls: string[];
    campaignSheetCsvUrls: string[];
}

/**
 * Lê as URLs dos CSVs publicados dos headers x-google-ads-sheet-urls e
 * x-google-ads-campaign-sheet-urls (cada um separado por vírgula) enviados
 * pelo cliente — uma por MCC, já que cada Google Ads Script só enxerga as
 * contas da MCC onde ele foi colado.
 */
export function getGoogleAdsCreds(request: NextRequest): GoogleAdsCreds | null {
    const parseList = (header: string) => (request.headers.get(header) || '').split(',').map(u => u.trim()).filter(Boolean);
    const sheetCsvUrls = parseList('x-google-ads-sheet-urls');
    const campaignSheetCsvUrls = parseList('x-google-ads-campaign-sheet-urls');
    if (sheetCsvUrls.length === 0 && campaignSheetCsvUrls.length === 0) return null;
    return { sheetCsvUrls, campaignSheetCsvUrls };
}

// ─────────────────────────────────────────────────────────────
// CSV PARSING
// ─────────────────────────────────────────────────────────────

/** Parser CSV simples (com suporte a aspas) — suficiente para o export do Google Sheets. */
function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
            if (c === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else cur += c;
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { cells.push(cur); cur = ''; }
            else cur += c;
        }
    }
    cells.push(cur);
    return cells;
}

/** As 9 métricas somáveis exportadas pelo script — nunca uma razão/média pronta (CTR, CPC etc. são recalculados aqui a partir das somas). */
export interface RawMetrics {
    cost: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionsValue: number;
    allConversions: number;
    allConversionsValue: number;
    viewThroughConversions: number;
    interactions: number;
}

const METRIC_COLUMNS: { key: keyof RawMetrics; column: string }[] = [
    { key: 'cost', column: 'cost' },
    { key: 'impressions', column: 'impressions' },
    { key: 'clicks', column: 'clicks' },
    { key: 'conversions', column: 'conversions' },
    { key: 'conversionsValue', column: 'conversions_value' },
    { key: 'allConversions', column: 'all_conversions' },
    { key: 'allConversionsValue', column: 'all_conversions_value' },
    { key: 'viewThroughConversions', column: 'view_through_conversions' },
    { key: 'interactions', column: 'interactions' },
];

function readMetricCells(cells: string[], idx: Record<string, number>): RawMetrics {
    const get = (key: string) => (idx[key] >= 0 ? Number(cells[idx[key]]) || 0 : 0);
    return {
        cost: get('cost'),
        impressions: get('impressions'),
        clicks: get('clicks'),
        conversions: get('conversions'),
        conversionsValue: get('conversions_value'),
        allConversions: get('all_conversions'),
        allConversionsValue: get('all_conversions_value'),
        viewThroughConversions: get('view_through_conversions'),
        interactions: get('interactions'),
    };
}

/**
 * Baixa um CSV publicado, valida colunas obrigatórias e mapeia cada linha
 * via `mapRow`. Colunas de métrica ausentes (planilha de versão anterior do
 * script) caem pra 0 em vez de quebrar — só as `requiredColumns` são
 * obrigatórias.
 */
async function fetchCsvRows<T>(
    url: string,
    requiredColumns: string[],
    mapRow: (cells: string[], idx: Record<string, number>) => T | null,
): Promise<T[]> {
    let res: Response;
    try {
        res = await fetch(url);
    } catch (e: any) {
        throw new Error(`Não consegui acessar a URL: ${e.message}`);
    }
    if (!res.ok) {
        throw new Error(`Falha ao baixar a planilha (HTTP ${res.status}). Confira se ela está publicada na web como CSV (Arquivo → Compartilhar → Publicar na Web).`);
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const idx: Record<string, number> = {};
    for (const col of [...requiredColumns, ...METRIC_COLUMNS.map(m => m.column)]) {
        idx[col] = header.indexOf(col);
    }
    for (const col of requiredColumns) {
        if (idx[col] < 0) {
            throw new Error(`A planilha não tem a coluna esperada "${col}". Confira se o Google Ads Script rodou e exportou certo (versão atual de scripts/google-ads-export.gs).`);
        }
    }

    const rows: T[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        if (cells.length < header.length) continue;
        const row = mapRow(cells, idx);
        if (row) rows.push(row);
    }
    return rows;
}

export interface SheetFetchResult<T> {
    url: string;
    rows: T[];
    error: string | null;
}

/**
 * Baixa várias planilhas (uma por MCC) em paralelo. Cada uma é independente
 * — se uma falhar (URL errada, script não rodou etc.), as outras continuam
 * normalmente; o chamador decide o que fazer com os erros.
 */
export async function fetchAllCsv<T>(urls: string[], fetchOne: (url: string) => Promise<T[]>): Promise<SheetFetchResult<T>[]> {
    return Promise.all(urls.map(async (url) => {
        try {
            const rows = await fetchOne(url);
            return { url, rows, error: null };
        } catch (e: any) {
            return { url, rows: [], error: e.message || String(e) };
        }
    }));
}

// ─────────────────────────────────────────────────────────────
// NÍVEL 1: CONTA (aba "dados")
// ─────────────────────────────────────────────────────────────

export interface DailyRow extends RawMetrics {
    date: string; // YYYY-MM-DD
    accountId: string;
    accountName: string;
}

export async function fetchAccountSheet(url: string): Promise<DailyRow[]> {
    return fetchCsvRows(url, ['date', 'account_id', 'account_name'], (cells, idx) => {
        const accountId = cells[idx.account_id]?.trim();
        const date = cells[idx.date]?.trim();
        if (!accountId || !date) return null;
        return {
            date,
            accountId,
            accountName: cells[idx.account_name]?.trim() || accountId,
            ...readMetricCells(cells, idx),
        };
    });
}

// ─────────────────────────────────────────────────────────────
// NÍVEL 2/3: CAMPANHA + GRUPO DE ANÚNCIOS (aba "campanhas")
// ─────────────────────────────────────────────────────────────

export interface CampaignDailyRow extends RawMetrics {
    date: string;
    accountId: string;
    campaignId: string;
    campaignName: string;
    campaignStatus: string;
    adGroupId: string;
    adGroupName: string;
    adGroupStatus: string;
}

const CAMPAIGN_REQUIRED_COLUMNS = ['date', 'account_id', 'campaign_id', 'campaign_name', 'campaign_status', 'adgroup_id', 'adgroup_name', 'adgroup_status'];

export async function fetchCampaignSheet(url: string): Promise<CampaignDailyRow[]> {
    return fetchCsvRows(url, CAMPAIGN_REQUIRED_COLUMNS, (cells, idx) => {
        const accountId = cells[idx.account_id]?.trim();
        const date = cells[idx.date]?.trim();
        const campaignId = cells[idx.campaign_id]?.trim();
        if (!accountId || !date || !campaignId) return null;
        return {
            date,
            accountId,
            campaignId,
            campaignName: cells[idx.campaign_name]?.trim() || campaignId,
            campaignStatus: cells[idx.campaign_status]?.trim() || '',
            adGroupId: cells[idx.adgroup_id]?.trim() || '',
            adGroupName: cells[idx.adgroup_name]?.trim() || '',
            adGroupStatus: cells[idx.adgroup_status]?.trim() || '',
            ...readMetricCells(cells, idx),
        };
    });
}

// ─────────────────────────────────────────────────────────────
// AGREGAÇÃO (comum aos 3 níveis)
// ─────────────────────────────────────────────────────────────

export interface DateRange { since: string; until: string; }

function inRange(date: string, range: DateRange): boolean {
    return date >= range.since && date <= range.until;
}

function sumMetrics(rows: RawMetrics[]): RawMetrics {
    const sum = (k: keyof RawMetrics) => rows.reduce((s, r) => s + r[k], 0);
    return {
        cost: sum('cost'), impressions: sum('impressions'), clicks: sum('clicks'),
        conversions: sum('conversions'), conversionsValue: sum('conversionsValue'),
        allConversions: sum('allConversions'), allConversionsValue: sum('allConversionsValue'),
        viewThroughConversions: sum('viewThroughConversions'), interactions: sum('interactions'),
    };
}

function deriveMetrics(m: RawMetrics) {
    const spend = m.cost;
    const { impressions, clicks, conversions, conversionsValue, allConversions, allConversionsValue, viewThroughConversions, interactions } = m;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const leads = conversions;
    const cpl = leads > 0 ? spend / leads : 0;
    const purchase_value = conversionsValue;
    const roas = spend > 0 ? purchase_value / spend : 0;
    const all_conversions = allConversions;
    const all_conversions_value = allConversionsValue;
    const cpa_all_conversions = all_conversions > 0 ? spend / all_conversions : 0;
    const view_through_conversions = viewThroughConversions;
    return {
        spend, impressions, clicks, ctr, cpc, cpm, leads, cpl, purchase_value, roas,
        all_conversions, all_conversions_value, cpa_all_conversions, view_through_conversions, interactions,
    };
}

type DerivedMetrics = ReturnType<typeof deriveMetrics>;

function pctDelta(curr: number, prev: number): number | null {
    return prev > 0 ? ((curr - prev) / prev) * 100 : null;
}

const DELTA_KEYS: (keyof DerivedMetrics)[] = [
    'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'leads', 'cpl',
    'purchase_value', 'roas', 'all_conversions', 'all_conversions_value',
    'cpa_all_conversions', 'view_through_conversions', 'interactions',
];

function buildDeltas(curr: DerivedMetrics, prev: DerivedMetrics | null): Record<string, number | null> | null {
    if (!prev) return null;
    const deltas: Record<string, number | null> = {};
    for (const k of DELTA_KEYS) deltas[k] = pctDelta(curr[k], prev[k]);
    return deltas;
}

const STATUS_LABEL: Record<string, string> = {
    ENABLED: 'Ativa', PAUSED: 'Pausada', REMOVED: 'Removida',
    UNKNOWN: '', UNSPECIFIED: '',
};

function buildRow(id: string, name: string, curr: RawMetrics, prev: RawMetrics | null, extra: Record<string, any>) {
    const derivedCurr = deriveMetrics(curr);
    const derivedPrev = prev ? deriveMetrics(prev) : null;
    return {
        id,
        source: 'google',
        name,
        currency: 'BRL',
        ...derivedCurr,
        purchases: 0, messaging_started: 0, reach: 0, frequency: 0,
        has_any_ads: derivedCurr.spend > 0 || derivedCurr.impressions > 0,
        has_ads_in_period: derivedCurr.spend > 0,
        issues: [] as string[],
        issue_categories: [] as string[],
        previous: derivedPrev,
        deltas: buildDeltas(derivedCurr, derivedPrev),
        health: undefined,
        ...extra,
    };
}

export interface GoogleAdsRowsResult {
    rows: any[];
    /** Erros por planilha (uma URL pode ter falhado sem derrubar as outras). */
    errors: { url: string; error: string }[];
}

function throwIfAllFailed(rowCount: number, sourceCount: number, errors: { url: string; error: string }[], emptyMessage: string) {
    if (rowCount === 0 && sourceCount > 0) {
        if (errors.length > 0) throw new Error(errors.map(e => e.error).join(' | '));
        throw new Error(emptyMessage);
    }
}

/**
 * Linhas de CONTA do Google Ads no mesmo formato usado pelas linhas do Meta
 * (spend/impressions/clicks/ctr/cpc/cpm/leads/cpl/.../previous/deltas), pra
 * poderem ser exibidas juntas na mesma InsightsTable do dashboard.
 */
export async function listGoogleAdsAccountRows(
    creds: GoogleAdsCreds,
    range: DateRange,
    prevRange: DateRange | null,
): Promise<GoogleAdsRowsResult> {
    const results = await fetchAllCsv(creds.sheetCsvUrls, fetchAccountSheet);
    const errors = results.filter(r => r.error).map(r => ({ url: r.url, error: r.error as string }));
    const rows = results.flatMap(r => r.rows);

    throwIfAllFailed(rows.length, creds.sheetCsvUrls.length, errors,
        'As planilhas de contas estão vazias ou o Google Ads Script ainda não rodou. Rode o script manualmente uma vez e confira a aba "dados".');

    const accountIds = Array.from(new Set(rows.map(r => r.accountId)));
    const accountRows = accountIds.map(accountId => {
        const nameRow = rows.find(r => r.accountId === accountId);
        const inAcc = rows.filter(r => r.accountId === accountId);
        const curr = sumMetrics(inAcc.filter(r => inRange(r.date, range)));
        const prev = prevRange ? sumMetrics(inAcc.filter(r => inRange(r.date, prevRange))) : null;
        return buildRow(`google:${accountId}`, nameRow?.accountName || accountId, curr, prev, { account_id: accountId });
    }).sort((a, b) => b.spend - a.spend);

    return { rows: accountRows, errors };
}

/**
 * Linhas de CAMPANHA de uma conta Google específica (soma todos os grupos de
 * anúncios de cada campanha). Base do drill-down ao clicar numa conta Google.
 */
export async function listGoogleAdsCampaignRows(
    creds: GoogleAdsCreds,
    accountId: string,
    range: DateRange,
    prevRange: DateRange | null,
): Promise<GoogleAdsRowsResult> {
    const results = await fetchAllCsv(creds.campaignSheetCsvUrls, fetchCampaignSheet);
    const errors = results.filter(r => r.error).map(r => ({ url: r.url, error: r.error as string }));
    const allRows = results.flatMap(r => r.rows).filter(r => r.accountId === accountId);

    throwIfAllFailed(allRows.length, creds.campaignSheetCsvUrls.length, errors,
        'A planilha de campanhas está vazia, não tem essa conta, ou o Google Ads Script ainda não rodou. Rode o script manualmente uma vez e confira a aba "campanhas".');

    const campaignIds = Array.from(new Set(allRows.map(r => r.campaignId)));
    const campaignRows = campaignIds.map(campaignId => {
        const inCampaign = allRows.filter(r => r.campaignId === campaignId);
        const nameRow = inCampaign[0];
        const curr = sumMetrics(inCampaign.filter(r => inRange(r.date, range)));
        const prev = prevRange ? sumMetrics(inCampaign.filter(r => inRange(r.date, prevRange))) : null;
        return buildRow(`google:${campaignId}`, nameRow.campaignName, curr, prev, {
            campaign_id: campaignId,
            status: nameRow.campaignStatus,
            status_label: STATUS_LABEL[nameRow.campaignStatus] || nameRow.campaignStatus,
        });
    }).sort((a, b) => b.spend - a.spend);

    return { rows: campaignRows, errors };
}

/**
 * Linhas de GRUPO DE ANÚNCIOS de uma campanha Google específica. Base do
 * drill-down ao clicar numa campanha Google (equivalente ao "conjunto" do
 * Meta).
 */
export async function listGoogleAdsAdGroupRows(
    creds: GoogleAdsCreds,
    campaignId: string,
    range: DateRange,
    prevRange: DateRange | null,
): Promise<GoogleAdsRowsResult> {
    const results = await fetchAllCsv(creds.campaignSheetCsvUrls, fetchCampaignSheet);
    const errors = results.filter(r => r.error).map(r => ({ url: r.url, error: r.error as string }));
    const allRows = results.flatMap(r => r.rows).filter(r => r.campaignId === campaignId);

    throwIfAllFailed(allRows.length, creds.campaignSheetCsvUrls.length, errors,
        'A planilha de campanhas está vazia ou não tem essa campanha. Rode o Google Ads Script novamente.');

    const adGroupIds = Array.from(new Set(allRows.map(r => r.adGroupId)));
    const adGroupRows = adGroupIds.map(adGroupId => {
        const inGroup = allRows.filter(r => r.adGroupId === adGroupId);
        const nameRow = inGroup[0];
        const curr = sumMetrics(inGroup.filter(r => inRange(r.date, range)));
        const prev = prevRange ? sumMetrics(inGroup.filter(r => inRange(r.date, prevRange))) : null;
        return buildRow(`google:${adGroupId}`, nameRow.adGroupName || adGroupId, curr, prev, {
            adgroup_id: adGroupId,
            status: nameRow.adGroupStatus,
            status_label: STATUS_LABEL[nameRow.adGroupStatus] || nameRow.adGroupStatus,
        });
    }).sort((a, b) => b.spend - a.spend);

    return { rows: adGroupRows, errors };
}
