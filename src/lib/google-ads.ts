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
 */

import { NextRequest } from 'next/server';

export interface GoogleAdsCreds {
    sheetCsvUrl: string;
}

/** Lê a URL do CSV publicado do header x-google-ads-sheet-url enviado pelo cliente. */
export function getGoogleAdsCreds(request: NextRequest): GoogleAdsCreds | null {
    const sheetCsvUrl = (request.headers.get('x-google-ads-sheet-url') || '').trim();
    if (!sheetCsvUrl) return null;
    return { sheetCsvUrl };
}

export interface DailyRow {
    date: string; // YYYY-MM-DD
    accountId: string;
    accountName: string;
    cost: number;
    impressions: number;
    clicks: number;
    conversions: number;
}

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

/** Baixa e faz o parse do CSV publicado — lança erro claro se a URL/formato estiver errado. */
export async function fetchGoogleAdsSheet(creds: GoogleAdsCreds): Promise<DailyRow[]> {
    let res: Response;
    try {
        res = await fetch(creds.sheetCsvUrl);
    } catch (e: any) {
        throw new Error(`Não consegui acessar a URL da planilha: ${e.message}`);
    }
    if (!res.ok) {
        throw new Error(`Falha ao baixar a planilha (HTTP ${res.status}). Confira se ela está publicada na web como CSV (Arquivo → Compartilhar → Publicar na Web).`);
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const idx = {
        date: header.indexOf('date'),
        accountId: header.indexOf('account_id'),
        accountName: header.indexOf('account_name'),
        cost: header.indexOf('cost'),
        impressions: header.indexOf('impressions'),
        clicks: header.indexOf('clicks'),
        conversions: header.indexOf('conversions'),
    };
    if (idx.date < 0 || idx.accountId < 0 || idx.cost < 0) {
        throw new Error('A planilha não tem as colunas esperadas (date, account_id, account_name, cost, impressions, clicks, conversions). Confira se o Google Ads Script rodou e exportou certo.');
    }

    const rows: DailyRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        if (cells.length < header.length) continue;
        const accountId = cells[idx.accountId]?.trim();
        const date = cells[idx.date]?.trim();
        if (!accountId || !date) continue;
        rows.push({
            date,
            accountId,
            accountName: cells[idx.accountName]?.trim() || accountId,
            cost: Number(cells[idx.cost]) || 0,
            impressions: Number(cells[idx.impressions]) || 0,
            clicks: Number(cells[idx.clicks]) || 0,
            conversions: Number(cells[idx.conversions]) || 0,
        });
    }
    return rows;
}

// ─────────────────────────────────────────────────────────────
// AGREGAÇÃO POR CONTA / PERÍODO
// ─────────────────────────────────────────────────────────────

export interface DateRange { since: string; until: string; }

interface RawTotals { cost: number; impressions: number; clicks: number; conversions: number; }

function sumInRange(rows: DailyRow[], accountId: string, range: DateRange): RawTotals {
    const filtered = rows.filter(r => r.accountId === accountId && r.date >= range.since && r.date <= range.until);
    return {
        cost: filtered.reduce((s, r) => s + r.cost, 0),
        impressions: filtered.reduce((s, r) => s + r.impressions, 0),
        clicks: filtered.reduce((s, r) => s + r.clicks, 0),
        conversions: filtered.reduce((s, r) => s + r.conversions, 0),
    };
}

function deriveMetrics(m: RawTotals) {
    const spend = m.cost;
    const { impressions, clicks, conversions } = m;
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
 * pra poderem ser exibidas juntas na mesma InsightsTable do dashboard.
 */
export async function listGoogleAdsAccountRows(
    creds: GoogleAdsCreds,
    range: DateRange,
    prevRange: DateRange | null,
): Promise<any[]> {
    const rows = await fetchGoogleAdsSheet(creds);
    if (rows.length === 0) {
        throw new Error('A planilha está vazia ou ainda não rodou o Google Ads Script. Rode o script manualmente uma vez e confira a aba "dados".');
    }

    const accountIds = Array.from(new Set(rows.map(r => r.accountId)));

    return accountIds.map(accountId => {
        const nameRow = rows.find(r => r.accountId === accountId);
        const currRaw = sumInRange(rows, accountId, range);
        const prevRaw = prevRange ? sumInRange(rows, accountId, prevRange) : null;
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
            id: `google:${accountId}`,
            source: 'google',
            name: nameRow?.accountName || accountId,
            account_id: accountId,
            currency: 'BRL',
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
    }).sort((a, b) => b.spend - a.spend);
}
