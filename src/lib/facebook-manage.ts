/**
 * Facebook Marketing API — operações de ESCRITA (criar/editar/duplicar campanhas,
 * conjuntos, anúncios, públicos e regras) para o Meu Gestor v3. Valores monetários
 * SEMPRE em centavos (inteiro) rumo à Meta.
 *
 * Obs: fbFetch/FB_GRAPH_URL não são exportados por '@/lib/facebook', portanto o
 * core HTTP (retry/backoff/erros) é reimplementado aqui com a MESMA semântica.
 */

import { createHash } from 'node:crypto';

const FB_API_VERSION = 'v22.0';
const FB_GRAPH_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

export type CampaignInput = {
    name: string;
    objective: 'OUTCOME_TRAFFIC' | 'OUTCOME_LEADS' | 'OUTCOME_SALES' | 'OUTCOME_ENGAGEMENT' | 'OUTCOME_AWARENESS' | 'OUTCOME_APP_PROMOTION';
    status: 'PAUSED' | 'ACTIVE';
    specialAdCategories: string[];
    dailyBudgetCents?: number;
    lifetimeBudgetCents?: number;
};

export type TargetingSpec = {
    geo_locations: {
        countries?: string[];
        cities?: { key: string; radius?: number; distance_unit?: string }[];
        regions?: { key: string }[];
    };
    age_min?: number;
    age_max?: number;
    genders?: number[];
    flexible_spec?: { interests: { id: string; name?: string }[] }[];
    custom_audiences?: { id: string }[];
    excluded_custom_audiences?: { id: string }[];
    targeting_automation?: { advantage_audience: 0 | 1 };
};

export type AdSetInput = {
    name: string;
    campaignId: string;
    status: 'PAUSED' | 'ACTIVE';
    dailyBudgetCents?: number;
    lifetimeBudgetCents?: number;
    optimizationGoal: string;
    billingEvent?: string;
    bidStrategy?: string;
    destinationType?: string;
    promotedObject?: { pixel_id?: string; custom_event_type?: string; page_id?: string };
    targeting: TargetingSpec;
    startTime?: string;
    endTime?: string;
};

export type AdCreativeInput = {
    existingCreativeId?: string;
    objectStoryId?: string;
    pageId?: string;
    link?: string;
    message?: string;
    headline?: string;
    description?: string;
    imageHash?: string;
    ctaType?: string;
};

export type AdInput = {
    name: string;
    adsetId: string;
    status: 'PAUSED' | 'ACTIVE';
    creative: AdCreativeInput;
};

// ─────────────────────────────────────────────────────────────
// CORE HTTP — mesma semântica de fbFetch em src/lib/facebook.ts
// ─────────────────────────────────────────────────────────────

// Códigos de erro Meta transitórios (vale retentar em requisições idempotentes):
//   1, 2 = temporário | 4, 17, 32, 341, 613 = rate limits
const TRANSIENT_FB_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);
// Subconjunto seguro para POST: rate limits falham ANTES de executar a escrita.
// Códigos 1/2, 5xx e quedas de rede são ambíguos — o objeto pode já ter sido
// criado; retentar duplicaria campanhas/conjuntos/anúncios.
const RATE_LIMIT_FB_CODES = new Set([4, 17, 32, 341, 613]);
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 800;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fbRequest(url: string, init?: RequestInit): Promise<any> {
    const isIdempotent = (init?.method || 'GET').toUpperCase() !== 'POST';
    let lastErr: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        let res: Response | undefined;
        try {
            res = await fetch(url, { ...init, cache: 'no-store' });
        } catch (netErr: any) {
            // erro de rede (DNS, timeout, reset). Retentar só se idempotente —
            // em POST a conexão pode ter caído APÓS a escrita ser executada.
            lastErr = netErr;
            if (isIdempotent && attempt < MAX_RETRIES) {
                await sleep(BASE_DELAY_MS * 2 ** attempt + Math.random() * 250);
                continue;
            }
            throw netErr;
        }

        // Parsear JSON mesmo em 4xx/5xx para obter json.error do Meta
        let json: any = null;
        try {
            json = await res.json();
        } catch {
            json = null;
        }

        if (json?.error) {
            const code = Number(json.error.code);
            const subcode = Number(json.error.error_subcode);
            const isTransient = isIdempotent
                ? TRANSIENT_FB_CODES.has(code) || subcode === 2446079
                : RATE_LIMIT_FB_CODES.has(code);
            const err: any = new Error(json.error.message || `Meta API HTTP ${res.status}`);
            err.fb = json.error;
            err.code = code;
            err.status = res.status;
            if (isTransient && attempt < MAX_RETRIES) {
                lastErr = err;
                const retryAfter = Number(res.headers.get('retry-after')) || 0;
                const delay = retryAfter > 0 ? retryAfter * 1000 : BASE_DELAY_MS * 2 ** attempt + Math.random() * 250;
                await sleep(delay);
                continue;
            }
            throw err;
        }

        // 5xx / 429 sem JSON — retentar (429 é pré-execução; 5xx só se idempotente)
        if (res.status >= 500 || res.status === 429) {
            const retryAfter = Number(res.headers.get('retry-after')) || 0;
            lastErr = new Error(`Meta HTTP ${res.status}${res.status === 429 ? ' (rate limit)' : ''}`);
            if ((res.status === 429 || isIdempotent) && attempt < MAX_RETRIES) {
                const delay = retryAfter > 0
                    ? retryAfter * 1000
                    : BASE_DELAY_MS * 2 ** attempt + Math.random() * 250;
                await sleep(delay);
                continue;
            }
            throw lastErr;
        }

        if (!json) {
            throw new Error(`Meta retornou resposta inválida (HTTP ${res.status})`);
        }

        return json;
    }
    throw lastErr || new Error('Meta API: falha após retries');
}

/** Serializa params: objetos/arrays viram JSON por campo; undefined/null são omitidos. */
function serializeParams(params: Record<string, unknown>): URLSearchParams {
    const out = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'object') out.set(key, JSON.stringify(value));
        else out.set(key, String(value));
    }
    return out;
}

/** Normaliza id de conta para o formato act_XXXX. */
function act(accountId: string): string {
    return accountId.startsWith('act_') ? accountId : `act_${accountId}`;
}

export async function fbPost(
    path: string,
    token: string,
    params: Record<string, unknown>,
    opts?: { validateOnly?: boolean },
): Promise<any> {
    const body = serializeParams(params);
    if (opts?.validateOnly) body.set('execution_options', JSON.stringify(['validate_only']));
    body.set('access_token', token);
    return fbRequest(`${FB_GRAPH_URL}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
}

export async function fbGet(
    path: string,
    token: string,
    params?: Record<string, string | number>,
): Promise<any> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
        if (value === undefined || value === null) continue;
        qs.set(key, String(value));
    }
    qs.set('access_token', token);
    return fbRequest(`${FB_GRAPH_URL}/${path}?${qs.toString()}`, { method: 'GET' });
}

async function fbDelete(path: string, token: string): Promise<any> {
    const qs = new URLSearchParams({ access_token: token });
    return fbRequest(`${FB_GRAPH_URL}/${path}?${qs.toString()}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────
// CAMPANHAS / CONJUNTOS / ANÚNCIOS
// ─────────────────────────────────────────────────────────────

export async function createCampaign(
    token: string,
    accountId: string,
    input: CampaignInput,
    validateOnly?: boolean,
): Promise<any> {
    const params: Record<string, unknown> = {
        name: input.name,
        objective: input.objective,
        status: input.status,
        special_ad_categories: input.specialAdCategories ?? [],
        buying_type: 'AUCTION',
        // Meta v22 exige este campo (subcode 4834011); false = orçamento tradicional
        is_adset_budget_sharing_enabled: false,
    };
    if (input.dailyBudgetCents !== undefined) params.daily_budget = input.dailyBudgetCents;
    if (input.lifetimeBudgetCents !== undefined) params.lifetime_budget = input.lifetimeBudgetCents;
    return fbPost(`${act(accountId)}/campaigns`, token, params, { validateOnly });
}

export async function createAdSet(
    token: string,
    accountId: string,
    input: AdSetInput,
    validateOnly?: boolean,
): Promise<any> {
    const hasOwnBudget = input.dailyBudgetCents !== undefined || input.lifetimeBudgetCents !== undefined;
    const targeting: TargetingSpec = {
        ...input.targeting,
        targeting_automation: input.targeting.targeting_automation ?? { advantage_audience: 0 },
    };
    const params: Record<string, unknown> = {
        name: input.name,
        campaign_id: input.campaignId,
        status: input.status,
        optimization_goal: input.optimizationGoal,
        billing_event: input.billingEvent || 'IMPRESSIONS',
        targeting,
    };
    // bid_strategy só quando o conjunto carrega o próprio orçamento (ABO).
    // Em CBO (orçamento na campanha) omitimos totalmente.
    if (hasOwnBudget) params.bid_strategy = input.bidStrategy || 'LOWEST_COST_WITHOUT_CAP';
    if (input.dailyBudgetCents !== undefined) params.daily_budget = input.dailyBudgetCents;
    if (input.lifetimeBudgetCents !== undefined) params.lifetime_budget = input.lifetimeBudgetCents;
    if (input.destinationType !== undefined) params.destination_type = input.destinationType;
    if (input.promotedObject !== undefined) params.promoted_object = input.promotedObject;
    if (input.startTime !== undefined) params.start_time = input.startTime;
    // lifetime_budget exige end_time — repassamos e deixamos a Meta validar.
    if (input.endTime !== undefined) params.end_time = input.endTime;
    return fbPost(`${act(accountId)}/adsets`, token, params, { validateOnly });
}

export async function uploadAdImage(
    token: string,
    accountId: string,
    base64: string,
    name?: string,
): Promise<{ hash: string }> {
    const bytes = base64.replace(/^data:[^;]*;base64,/, '');
    const params: Record<string, unknown> = { bytes };
    if (name !== undefined) params.name = name;
    const res = await fbPost(`${act(accountId)}/adimages`, token, params);
    const images = res?.images || {};
    const first: any = Object.values(images)[0];
    if (!first?.hash) throw new Error('Meta não retornou o hash da imagem enviada');
    return { hash: String(first.hash) };
}

export async function createAdWithCreative(
    token: string,
    accountId: string,
    input: AdInput,
    validateOnly?: boolean,
): Promise<any> {
    const acct = act(accountId);
    const c = input.creative;
    let creativeParam: Record<string, unknown>;
    let creativeId: string | undefined;

    if (c.existingCreativeId) {
        // (a) criativo já existente — validável direto no ad
        creativeParam = { creative_id: c.existingCreativeId };
    } else if (c.objectStoryId) {
        // (b) post existente -> adcreative com object_story_id
        const creativeSpec: Record<string, unknown> = { object_story_id: c.objectStoryId };
        if (validateOnly) {
            // valida o adcreative sem criar nada e segue para validar também o
            // /ads com o spec inline (o param 'creative' aceita spec completo)
            await fbPost(`${acct}/adcreatives`, token, creativeSpec, { validateOnly: true });
            creativeParam = creativeSpec;
        } else {
            const created = await fbPost(`${acct}/adcreatives`, token, creativeSpec);
            creativeId = created?.id;
            creativeParam = { creative_id: creativeId };
        }
    } else if (c.pageId && c.link) {
        // (c) criativo novo a partir de página + link
        const linkData: Record<string, unknown> = { link: c.link };
        if (c.message !== undefined) linkData.message = c.message;
        if (c.headline !== undefined) linkData.name = c.headline;
        if (c.description !== undefined) linkData.description = c.description;
        if (c.imageHash !== undefined) linkData.image_hash = c.imageHash;
        const ctaType = c.ctaType || 'LEARN_MORE';
        if (ctaType === 'WHATSAPP_MESSAGE') {
            // CTA de mensagem: Meta exige value.app_destination e o deep link do
            // WhatsApp em link_data.link (link de site comum é rejeitado)
            if (!/(?:wa\.me|api\.whatsapp\.com)/i.test(c.link)) {
                linkData.link = 'https://api.whatsapp.com/send';
            }
            linkData.call_to_action = { type: ctaType, value: { app_destination: 'WHATSAPP' } };
        } else {
            linkData.call_to_action = { type: ctaType, value: { link: c.link } };
        }
        const creativeSpec: Record<string, unknown> = {
            name: `${input.name} - Criativo`,
            object_story_spec: { page_id: c.pageId, link_data: linkData },
        };
        if (validateOnly) {
            // valida o adcreative sem criar nada e segue para validar também o
            // /ads com o spec inline (o param 'creative' aceita spec completo)
            await fbPost(`${acct}/adcreatives`, token, creativeSpec, { validateOnly: true });
            creativeParam = creativeSpec;
        } else {
            const created = await fbPost(`${acct}/adcreatives`, token, creativeSpec);
            creativeId = created?.id;
            creativeParam = { creative_id: creativeId };
        }
    } else {
        throw new Error('Criativo inválido: informe existingCreativeId, objectStoryId ou pageId + link');
    }

    const adRes = await fbPost(`${acct}/ads`, token, {
        name: input.name,
        adset_id: input.adsetId,
        status: input.status,
        creative: creativeParam,
    }, { validateOnly });

    const result: Record<string, unknown> = { ...(adRes || {}) };
    if (creativeId) result.creative_id = creativeId;
    return result;
}

export async function copyEntity(
    token: string,
    args: { id: string; kind: 'campaign' | 'adset' | 'ad'; deep?: boolean; suffix?: string },
): Promise<any> {
    const params: Record<string, unknown> = { status_option: 'PAUSED' };
    if (args.kind === 'campaign') {
        params.deep_copy = !!args.deep;
        params.rename_options = { rename_suffix: args.suffix || ' - Cópia' };
    } else if (args.kind === 'adset') {
        params.deep_copy = !!args.deep;
        // rename_options omitido para adset/ad (suporte incerto na Meta)
    }
    return fbPost(`${args.id}/copies`, token, params);
}

export async function updateEntity(
    token: string,
    id: string,
    fields: { name?: string; dailyBudgetCents?: number; lifetimeBudgetCents?: number; status?: string },
): Promise<any> {
    const params: Record<string, unknown> = {};
    if (fields.name !== undefined) params.name = fields.name;
    if (fields.dailyBudgetCents !== undefined) params.daily_budget = fields.dailyBudgetCents;
    if (fields.lifetimeBudgetCents !== undefined) params.lifetime_budget = fields.lifetimeBudgetCents;
    if (fields.status !== undefined) params.status = fields.status;
    return fbPost(id, token, params);
}

// ─────────────────────────────────────────────────────────────
// PÚBLICOS (custom audiences / lookalikes)
// ─────────────────────────────────────────────────────────────

export async function listAudiences(token: string, accountId: string): Promise<any[]> {
    const res = await fbGet(`${act(accountId)}/customaudiences`, token, {
        fields: [
            'id', 'name', 'subtype', 'description',
            'approximate_count_lower_bound', 'approximate_count_upper_bound',
            'delivery_status', 'operation_status', 'time_updated', 'lookalike_spec',
        ].join(','),
        limit: 200,
    });
    return res?.data || [];
}

export async function createCustomAudience(
    token: string,
    accountId: string,
    input: { name: string; description?: string },
): Promise<any> {
    const params: Record<string, unknown> = {
        name: input.name,
        subtype: 'CUSTOM',
        customer_file_source: 'USER_PROVIDED_ONLY',
    };
    if (input.description !== undefined) params.description = input.description;
    return fbPost(`${act(accountId)}/customaudiences`, token, params);
}

const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');

export async function addUsersToAudience(
    token: string,
    audienceId: string,
    input: { emails?: string[]; phones?: string[] },
): Promise<{ received: number; invalid: number }> {
    let received = 0;
    let invalid = 0;

    const sendBatches = async (schema: string, hashes: string[]) => {
        for (let i = 0; i < hashes.length; i += 5000) {
            const chunk = hashes.slice(i, i + 5000);
            const res = await fbPost(`${audienceId}/users`, token, {
                payload: { schema: [schema], data: chunk.map(h => [h]) },
            });
            received += Number(res?.num_received || 0);
            invalid += Number(res?.num_invalid_entries || 0);
        }
    };

    const emailHashes = (input.emails || [])
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
        .map(sha256Hex);

    // Spec de hashing da Meta: só dígitos, com DDI e sem zeros à esquerda.
    const phoneHashes: string[] = [];
    for (const p of input.phones || []) {
        const hasDdi = p.trim().startsWith('+'); // DDI explícito no original
        // remove zeros à esquerda (prefixo de tronco/operadora: '011...' -> '11...')
        const digits = p.replace(/\D/g, '').replace(/^0+/, '');
        if (!digits) continue;
        let normalized = digits;
        if (!hasDdi) {
            if (digits.length >= 10 && digits.length <= 11) {
                // DDD + número sem DDI: assume Brasil e prefixa 55
                normalized = `55${digits}`;
            } else if (digits.length < 10) {
                // sem DDD/DDI não há como normalizar para E.164 — o hash nunca
                // casaria na Meta; contamos como inválido em vez de enviar em silêncio
                invalid++;
                continue;
            }
            // >= 12 dígitos: assume que já inclui DDI
        }
        phoneHashes.push(sha256Hex(normalized));
    }

    if (emailHashes.length > 0) await sendBatches('EMAIL_SHA256', emailHashes);
    if (phoneHashes.length > 0) await sendBatches('PHONE_SHA256', phoneHashes);

    return { received, invalid };
}

export async function createLookalike(
    token: string,
    accountId: string,
    input: { originAudienceId: string; country: string; ratio: number },
): Promise<any> {
    const pct = Math.round(input.ratio * 100);
    return fbPost(`${act(accountId)}/customaudiences`, token, {
        name: `Lookalike ${pct}% - ${input.country} - ${input.originAudienceId}`,
        subtype: 'LOOKALIKE',
        origin_audience_id: input.originAudienceId,
        lookalike_spec: { type: 'custom_ratio', ratio: input.ratio, country: input.country },
    });
}

// ─────────────────────────────────────────────────────────────
// SEGMENTAÇÃO / ESTIMATIVAS / RECURSOS DA CONTA
// ─────────────────────────────────────────────────────────────

export async function searchTargeting(
    token: string,
    args: { type: 'interest' | 'geo'; q: string; country?: string },
): Promise<any[]> {
    const params: Record<string, string | number> = { q: args.q, limit: 25 };
    if (args.type === 'interest') {
        params.type = 'adinterest';
    } else {
        params.type = 'adgeolocation';
        params.location_types = JSON.stringify(['city', 'region', 'country']);
        if (args.country) params.country_code = args.country;
    }
    const res = await fbGet('search', token, params);
    return res?.data || [];
}

export async function getDeliveryEstimate(
    token: string,
    accountId: string,
    args: { targeting: TargetingSpec; optimizationGoal: string },
): Promise<any> {
    const res = await fbGet(`${act(accountId)}/delivery_estimate`, token, {
        targeting_spec: JSON.stringify(args.targeting),
        optimization_goal: args.optimizationGoal,
    });
    return res?.data?.[0] || null;
}

export async function listPixels(token: string, accountId: string): Promise<any[]> {
    const res = await fbGet(`${act(accountId)}/adspixels`, token, { fields: 'id,name' });
    return res?.data || [];
}

export async function listPages(
    token: string,
    accountId: string,
): Promise<{ id: string; name: string }[]> {
    const acct = act(accountId);
    const pages = new Map<string, string>();

    // 1) páginas promovíveis da conta
    try {
        const res = await fbGet(`${acct}/promote_pages`, token, { fields: 'id,name', limit: 100 });
        for (const p of res?.data || []) {
            if (p?.id) pages.set(String(p.id), p.name || String(p.id));
        }
    } catch {
        // tolerar falha — seguimos para a derivação via criativos
    }

    // 2) derivar page_ids distintos dos criativos recentes
    try {
        const res = await fbGet(`${acct}/adcreatives`, token, { fields: 'object_story_spec', limit: 100 });
        const derived = new Set<string>();
        for (const creative of res?.data || []) {
            const pid = creative?.object_story_spec?.page_id;
            if (pid) derived.add(String(pid));
        }
        for (const pid of derived) {
            if (pages.has(pid)) continue;
            try {
                const page = await fbGet(pid, token, { fields: 'id,name' });
                pages.set(pid, page?.name || pid);
            } catch {
                pages.set(pid, pid); // fallback: nome = id
            }
        }
    } catch {
        // tolerar falha
    }

    return Array.from(pages.entries()).map(([id, name]) => ({ id, name }));
}

export async function listRecentCreatives(
    token: string,
    accountId: string,
    limit?: number,
): Promise<any[]> {
    const res = await fbGet(`${act(accountId)}/adcreatives`, token, {
        fields: 'id,name,thumbnail_url,object_story_id,object_type,status',
        limit: limit ?? 40,
    });
    return (res?.data || []).filter((c: any) => c?.object_story_id || c?.thumbnail_url);
}

// ─────────────────────────────────────────────────────────────
// REGRAS AUTOMATIZADAS (adrules_library)
// ─────────────────────────────────────────────────────────────

export async function listAdRules(token: string, accountId: string): Promise<any[]> {
    const res = await fbGet(`${act(accountId)}/adrules_library`, token, {
        fields: 'id,name,status,evaluation_spec,execution_spec,schedule_spec',
        limit: 100,
    });
    return res?.data || [];
}

export async function createAdRule(
    token: string,
    accountId: string,
    rule: Record<string, unknown>,
): Promise<any> {
    // serializeParams (via fbPost) já JSON-stringifica evaluation_spec/execution_spec/schedule_spec
    return fbPost(`${act(accountId)}/adrules_library`, token, rule);
}

export async function deleteAdRule(token: string, ruleId: string): Promise<any> {
    return fbDelete(ruleId, token);
}
