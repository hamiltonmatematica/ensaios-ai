"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ChangeEvent, ReactNode } from "react";
import {
    X, Check, Search, Loader2, Rocket, AlertCircle, ExternalLink,
    MousePointerClick, Users, ShoppingCart, Heart, Megaphone,
    Image as ImageIcon, Upload, Target, ChevronRight,
} from "lucide-react";

/* ─────────────────────────── Tipos ─────────────────────────── */

interface Props {
    open: boolean;
    onClose: () => void;
    accountId: string | null;
    accounts: { id: string; name: string }[];
    apiHeaders: Record<string, string>;
    onCreated: () => void;
}

type Objective =
    | "OUTCOME_TRAFFIC" | "OUTCOME_LEADS" | "OUTCOME_SALES"
    | "OUTCOME_ENGAGEMENT" | "OUTCOME_AWARENESS" | "OUTCOME_APP_PROMOTION";

interface GeoResult {
    key: string; name: string; type: string;
    region?: string; country_name?: string; country_code?: string;
}
interface InterestResult {
    id: string; name: string;
    audience_size_lower_bound?: number; audience_size_upper_bound?: number; audience_size?: number;
}
interface Audience {
    id: string; name: string; subtype?: string;
    approximate_count_lower_bound?: number; approximate_count?: number;
}
interface Assets {
    pixels: { id: string; name?: string }[];
    pages: { id: string; name?: string }[];
    creatives: { id: string; name?: string; thumbnail_url?: string }[];
}
interface GeoChip { key: string; name: string }

type StepState = "pending" | "doing" | "done" | "error";
type Progress = Record<"campaign" | "adset" | "ad", StepState>;

/* ─────────────────────────── Catálogos ─────────────────────────── */

const OBJECTIVES: { value: Objective; label: string; icon: typeof MousePointerClick }[] = [
    { value: "OUTCOME_TRAFFIC", label: "Tráfego", icon: MousePointerClick },
    { value: "OUTCOME_LEADS", label: "Leads", icon: Users },
    { value: "OUTCOME_SALES", label: "Vendas", icon: ShoppingCart },
    { value: "OUTCOME_ENGAGEMENT", label: "Engajamento", icon: Heart },
    { value: "OUTCOME_AWARENESS", label: "Reconhecimento", icon: Megaphone },
    /* OUTCOME_APP_PROMOTION removido: exige promoted_object (application_id +
       object_store_url) e o wizard ainda não coleta o app promovido. */
];

const SPECIAL_CATS: { value: string; label: string }[] = [
    { value: "HOUSING", label: "Habitação" },
    { value: "EMPLOYMENT", label: "Emprego" },
    { value: "CREDIT", label: "Crédito" },
    { value: "ISSUES_ELECTIONS_POLITICS", label: "Política" },
    { value: "FINANCIAL_PRODUCTS_SERVICES", label: "Serviços financeiros" },
];

const OPT_GOALS: Record<Objective, { value: string; label: string }[]> = {
    OUTCOME_TRAFFIC: [
        { value: "LINK_CLICKS", label: "Cliques no link" },
        { value: "LANDING_PAGE_VIEWS", label: "Visualizações da página" },
    ],
    OUTCOME_LEADS: [
        { value: "OFFSITE_CONVERSIONS", label: "Conversões no site (pixel)" },
        { value: "LEAD_GENERATION", label: "Formulários (requer página)" },
    ],
    OUTCOME_SALES: [
        { value: "OFFSITE_CONVERSIONS", label: "Conversões (pixel)" },
    ],
    OUTCOME_ENGAGEMENT: [
        { value: "POST_ENGAGEMENT", label: "Engajamento" },
        { value: "CONVERSATIONS", label: "Conversas (WhatsApp/Direct)" },
    ],
    OUTCOME_AWARENESS: [
        { value: "REACH", label: "Alcance" },
        { value: "IMPRESSIONS", label: "Impressões" },
    ],
    OUTCOME_APP_PROMOTION: [
        { value: "APP_INSTALLS", label: "Instalações" },
    ],
};

const PIXEL_EVENTS: { value: string; label: string }[] = [
    { value: "PURCHASE", label: "Compra" },
    { value: "LEAD", label: "Lead" },
    { value: "COMPLETE_REGISTRATION", label: "Cadastro" },
    { value: "ADD_TO_CART", label: "Carrinho" },
    { value: "INITIATE_CHECKOUT", label: "Checkout" },
    { value: "CONTACT", label: "Contato" },
    { value: "SUBSCRIBE", label: "Assinatura" },
];

const CTAS: { value: string; label: string }[] = [
    { value: "LEARN_MORE", label: "Saiba mais" },
    { value: "SHOP_NOW", label: "Comprar agora" },
    { value: "SIGN_UP", label: "Cadastre-se" },
    { value: "SUBSCRIBE", label: "Assinar" },
    { value: "CONTACT_US", label: "Fale conosco" },
    { value: "WHATSAPP_MESSAGE", label: "WhatsApp" },
    { value: "DOWNLOAD", label: "Baixar" },
];

const GEO_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
    country: { label: "País", cls: "g-badge-success" },
    city: { label: "Cidade", cls: "g-badge-info" },
    region: { label: "Estado", cls: "g-badge-purple" },
    subcity: { label: "Cidade", cls: "g-badge-info" },
    neighborhood: { label: "Bairro", cls: "g-badge-warning" },
};

/* ─────────────────────────── Helpers ─────────────────────────── */

const fmtCompact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("pt-BR");
const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const parseReais = (s: string): number => {
    let t = s.trim();
    if (!t) return 0;
    if (t.includes(",")) {
        // pt-BR: pontos separam milhares, vírgula é o decimal (ex.: 1.234,56)
        t = t.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
        // Apenas pontos em grupos de 3 dígitos: separador de milhar (ex.: 1.000)
        t = t.replace(/\./g, "");
    }
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
};
const toCents = (s: string) => Math.round(parseReais(s) * 100);

const labelSt: CSSProperties = { display: "block", fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.35rem", fontWeight: 600 };
const inputSt: CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "0.5rem", padding: "0.55rem 0.75rem", color: "white", fontSize: "0.8rem", outline: "none",
};
const optSt: CSSProperties = { background: "#141733", color: "white" };
const sectionSt: CSSProperties = {
    fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.45)", fontWeight: 700, margin: "1.4rem 0 0.6rem",
};
const dropdownSt: CSSProperties = {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
    background: "#141733", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem",
    maxHeight: 210, overflowY: "auto", boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
};

/* ─────────────────────────── Sub-componentes ─────────────────────────── */

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div style={{ marginBottom: "0.9rem" }}>
            <label style={labelSt}>{label}</label>
            {children}
            {hint && <p style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.4)", marginTop: "0.3rem" }}>{hint}</p>}
        </div>
    );
}

function Toggle({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint?: string }) {
    return (
        <button type="button" onClick={onToggle} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
            <span style={{ width: 34, height: 20, borderRadius: 999, background: on ? "#4c6ef5" : "rgba(255,255,255,0.15)", position: "relative", transition: "background 0.2s", flexShrink: 0, marginTop: 1 }}>
                <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
            </span>
            <span>
                <span style={{ display: "block", fontSize: "0.78rem", color: "white", fontWeight: 600 }}>{label}</span>
                {hint && <span style={{ display: "block", fontSize: "0.66rem", color: "rgba(255,255,255,0.4)" }}>{hint}</span>}
            </span>
        </button>
    );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.6rem",
            background: "rgba(76,110,245,0.15)", border: "1px solid rgba(76,110,245,0.35)",
            borderRadius: 999, fontSize: "0.72rem", color: "#c3d0ff",
        }}>
            {label}
            <button type="button" onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "inline-flex", padding: 0 }}>
                <X style={{ width: 11, height: 11 }} />
            </button>
        </span>
    );
}

function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>R$</span>
                <input
                    value={value}
                    onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
                    placeholder={placeholder || "50,00"}
                    inputMode="decimal"
                    style={{ ...inputSt, paddingLeft: "2.3rem" }}
                />
            </div>
            {value.trim() !== "" && (
                <p style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.45)", margin: "0.25rem 0 0" }}>
                    Valor interpretado: {fmtBRL.format(parseReais(value))}
                </p>
            )}
        </div>
    );
}

function StepRow({ state, label, id }: { state: StepState; label: string; id?: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.75rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {state === "pending" && <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />}
            {state === "doing" && <Loader2 className="g-pulse" style={{ width: 16, height: 16, color: "#748ffc", flexShrink: 0 }} />}
            {state === "done" && <Check style={{ width: 16, height: 16, color: "#34d399", flexShrink: 0 }} />}
            {state === "error" && <X style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0 }} />}
            <span style={{ fontSize: "0.8rem", color: state === "pending" ? "rgba(255,255,255,0.4)" : "white", fontWeight: 600 }}>
                {label}{state === "doing" ? "…" : ""}
            </span>
            {id && <span style={{ marginLeft: "auto", fontSize: "0.66rem", color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>ID: {id}</span>}
        </div>
    );
}

/* ─────────────────────────── Componente principal ─────────────────────────── */

export default function CreateCampaignWizard({ open, onClose, accountId, accounts, apiHeaders, onCreated }: Props) {
    /* Navegação */
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [stepError, setStepError] = useState<string | null>(null);

    /* Passo 1 — Campanha */
    const [selAccountId, setSelAccountId] = useState<string>(accountId || "");
    const [campName, setCampName] = useState("");
    const [objective, setObjective] = useState<Objective>("OUTCOME_TRAFFIC");
    const [cbo, setCbo] = useState(false);
    const [campBudget, setCampBudget] = useState("");
    const [specialCats, setSpecialCats] = useState<string[]>([]);

    /* Passo 2 — Conjunto */
    const [adsetName, setAdsetName] = useState("");
    const [adsetNameTouched, setAdsetNameTouched] = useState(false);
    const [adsetBudget, setAdsetBudget] = useState("");
    const [optimizationGoal, setOptimizationGoal] = useState("LINK_CLICKS");
    const [pixelId, setPixelId] = useState("");
    const [pixelEvent, setPixelEvent] = useState("PURCHASE");
    /* pageId é usado no passo 2 (Conversas/Formulários) e no passo 3 — estado içado */
    const [pageId, setPageId] = useState("");

    /* Segmentação */
    const [countries, setCountries] = useState<string[]>(["BR"]);
    const [cities, setCities] = useState<GeoChip[]>([]);
    const [regions, setRegions] = useState<GeoChip[]>([]);
    const [geoQuery, setGeoQuery] = useState("");
    const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
    const [geoLoading, setGeoLoading] = useState(false);
    const [ageMin, setAgeMin] = useState(18);
    const [ageMax, setAgeMax] = useState(65);
    const [genders, setGenders] = useState<number[]>([]);
    const [interestQuery, setInterestQuery] = useState("");
    const [interestResults, setInterestResults] = useState<InterestResult[]>([]);
    const [interestLoading, setInterestLoading] = useState(false);
    const [interests, setInterests] = useState<{ id: string; name: string; size: number }[]>([]);
    const [incAud, setIncAud] = useState<string[]>([]);
    const [excAud, setExcAud] = useState<string[]>([]);
    const [advantage, setAdvantage] = useState(false);

    /* Estimativa */
    const [estimate, setEstimate] = useState<{ lower: number | null; upper: number | null } | null>(null);
    const [estLoading, setEstLoading] = useState(false);
    const estimateSeqRef = useRef(0);

    /* Passo 3 — Anúncio */
    const [adName, setAdName] = useState("");
    const [adNameTouched, setAdNameTouched] = useState(false);
    const [creativeMode, setCreativeMode] = useState<"existing" | "new">("new");
    const [selectedCreativeId, setSelectedCreativeId] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [primaryText, setPrimaryText] = useState("");
    const [headline, setHeadline] = useState("");
    const [description, setDescription] = useState("");
    const [cta, setCta] = useState("LEARN_MORE");
    const [imageBase64, setImageBase64] = useState("");
    const [imageName, setImageName] = useState("");
    const [imagePreview, setImagePreview] = useState("");
    const [activate, setActivate] = useState(false);

    /* Ativos da conta */
    const [assets, setAssets] = useState<Assets>({ pixels: [], pages: [], creatives: [] });
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const assetsAccountRef = useRef<string | null>(null);

    /* Validação / Criação */
    const [validating, setValidating] = useState(false);
    const [validateMsg, setValidateMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [tosUrl, setTosUrl] = useState<string | null>(null);
    const [createdIds, setCreatedIds] = useState<{ campaignId?: string; adsetId?: string; adId?: string; creativeId?: string }>({});
    /* Snapshot dos payloads usados ao criar cada objeto — invalida o reaproveitamento se o usuário editar os dados */
    const createdSnapRef = useRef<{ campaign?: string; adset?: string }>({});

    const finished = progress !== null && progress.ad === "done";

    /* ── Fetch helpers ── */
    const getJson = async (url: string) => {
        const res = await fetch(url, { headers: { ...apiHeaders } });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Erro desconhecido");
        return json;
    };
    const postJson = async (url: string, body: unknown) => {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...apiHeaders },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.success) {
            const err = new Error(json.error || "Erro desconhecido") as Error & { tosUrl?: string };
            if (json.tosUrl) err.tosUrl = json.tosUrl;
            throw err;
        }
        return json;
    };

    /* ── Reset ao reabrir após sucesso ── */
    useEffect(() => {
        if (!open) return;
        /* Prioriza a conta aberta no dashboard: evita criar campanha na conta errada ao reabrir */
        setSelAccountId(prev => accountId || prev);
        if (progress?.ad === "done") {
            setStep(1); setStepError(null);
            setCampName(""); setObjective("OUTCOME_TRAFFIC"); setCbo(false); setCampBudget(""); setSpecialCats([]);
            setAdsetName(""); setAdsetNameTouched(false); setAdsetBudget(""); setOptimizationGoal("LINK_CLICKS");
            setCountries(["BR"]); setCities([]); setRegions([]); setGeoQuery(""); setGeoResults([]);
            setAgeMin(18); setAgeMax(65); setGenders([]);
            setInterestQuery(""); setInterestResults([]); setInterests([]);
            setIncAud([]); setExcAud([]); setAdvantage(false);
            setEstimate(null);
            setAdName(""); setAdNameTouched(false); setCreativeMode("new"); setSelectedCreativeId("");
            setLinkUrl(""); setPrimaryText(""); setHeadline(""); setDescription(""); setCta("LEARN_MORE");
            setImageBase64(""); setImageName(""); setImagePreview(""); setActivate(false);
            setValidateMsg(null); setProgress(null); setCreateError(null); setTosUrl(null); setCreatedIds({});
            createdSnapRef.current = {};
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, accountId]);

    /* ── Nomes automáticos ── */
    useEffect(() => {
        if (!adsetNameTouched) setAdsetName(campName ? `CJ - ${campName}` : "");
    }, [campName, adsetNameTouched]);
    useEffect(() => {
        if (!adNameTouched) setAdName(adsetName ? `AD - ${adsetName}` : "");
    }, [adsetName, adNameTouched]);

    /* ── Otimização padrão ao trocar objetivo ── */
    useEffect(() => {
        setOptimizationGoal(OPT_GOALS[objective][0].value);
        setPixelEvent(objective === "OUTCOME_LEADS" ? "LEAD" : "PURCHASE");
    }, [objective]);

    /* ── Ativos por conta (uma vez por seleção) ── */
    useEffect(() => {
        if (!open || !selAccountId || selAccountId === assetsAccountRef.current) return;
        assetsAccountRef.current = selAccountId;
        setPixelId(""); setPageId(""); setSelectedCreativeId("");
        setIncAud([]); setExcAud([]); setEstimate(null);
        let cancelled = false;
        (async () => {
            setAssetsLoading(true);
            try {
                const json = await getJson(`/api/meugestor/manage/assets?accountId=${encodeURIComponent(selAccountId)}`);
                if (!cancelled) {
                    const d = json.data || {};
                    setAssets({ pixels: d.pixels || [], pages: d.pages || [], creatives: d.creatives || [] });
                    if (d.pixels?.length) setPixelId((prev: string) => prev || d.pixels[0].id);
                    if (d.pages?.length) setPageId((prev: string) => prev || d.pages[0].id);
                }
            } catch {
                /* Limpa o carimbo para tentar de novo ao reabrir (ex.: token corrigido depois) */
                assetsAccountRef.current = null;
                if (!cancelled) setAssets({ pixels: [], pages: [], creatives: [] });
            }
            try {
                const json = await getJson(`/api/meugestor/manage/audiences?accountId=${encodeURIComponent(selAccountId)}`);
                if (!cancelled) setAudiences(json.data || []);
            } catch {
                assetsAccountRef.current = null;
                if (!cancelled) setAudiences([]);
            }
            if (!cancelled) setAssetsLoading(false);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selAccountId]);

    /* ── Busca geo (debounce 350ms) ── */
    useEffect(() => {
        if (!geoQuery.trim()) { setGeoResults([]); setGeoLoading(false); return; }
        setGeoLoading(true);
        const t = setTimeout(async () => {
            try {
                const country = countries[0] || "BR";
                const json = await getJson(`/api/meugestor/manage/search?type=geo&q=${encodeURIComponent(geoQuery)}&country=${encodeURIComponent(country)}`);
                setGeoResults(json.data || []);
            } catch { setGeoResults([]); }
            setGeoLoading(false);
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geoQuery]);

    /* ── Busca interesses (debounce 350ms) ── */
    useEffect(() => {
        if (!interestQuery.trim()) { setInterestResults([]); setInterestLoading(false); return; }
        setInterestLoading(true);
        const t = setTimeout(async () => {
            try {
                const json = await getJson(`/api/meugestor/manage/search?type=interest&q=${encodeURIComponent(interestQuery)}`);
                setInterestResults(json.data || []);
            } catch { setInterestResults([]); }
            setInterestLoading(false);
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interestQuery]);

    /* ── Segmentação (formato Meta) ── */
    const targeting = useMemo(() => {
        const t: Record<string, unknown> = {
            geo_locations: {
                ...(countries.length ? { countries } : {}),
                ...(cities.length ? { cities: cities.map(c => ({ key: c.key, radius: 40, distance_unit: "kilometer" })) } : {}),
                ...(regions.length ? { regions: regions.map(r => ({ key: r.key })) } : {}),
            },
            age_min: ageMin,
            age_max: ageMax,
            targeting_automation: { advantage_audience: advantage ? 1 : 0 },
        };
        if (genders.length) t.genders = genders;
        if (interests.length) t.flexible_spec = [{ interests: interests.map(i => ({ id: i.id, name: i.name })) }];
        if (incAud.length) t.custom_audiences = incAud.map(id => ({ id }));
        if (excAud.length) t.excluded_custom_audiences = excAud.map(id => ({ id }));
        return t;
    }, [countries, cities, regions, ageMin, ageMax, genders, interests, incAud, excAud, advantage]);
    const targetingKey = useMemo(() => JSON.stringify(targeting), [targeting]);

    const hasGeo = countries.length + cities.length + regions.length > 0;

    const refreshEstimate = async () => {
        if (!selAccountId || !hasGeo) return;
        const seq = ++estimateSeqRef.current;
        setEstLoading(true);
        try {
            const json = await postJson("/api/meugestor/manage/estimate", { accountId: selAccountId, optimizationGoal, targeting });
            if (seq !== estimateSeqRef.current) return; // resposta antiga: descarta
            const d = Array.isArray(json.data) ? json.data[0] : json.data;
            const lower = d?.users_lower_bound ?? d?.estimate_mau_lower_bound ?? d?.users ?? null;
            const upper = d?.users_upper_bound ?? d?.estimate_mau_upper_bound ?? null;
            setEstimate(lower !== null || upper !== null ? { lower, upper } : null);
        } catch {
            if (seq === estimateSeqRef.current) setEstimate(null);
        }
        if (seq === estimateSeqRef.current) setEstLoading(false);
    };

    /* ── Estimativa ao vivo (debounce 600ms) ── */
    useEffect(() => {
        if (!open || step !== 2 || !selAccountId || !hasGeo) return;
        const t = setTimeout(() => { refreshEstimate(); }, 600);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, step, selAccountId, optimizationGoal, targetingKey]);

    if (!open) return null;

    /* ── Payloads ── */
    const buildCampaign = () => {
        const c: Record<string, unknown> = {
            name: campName.trim(),
            objective,
            status: activate ? "ACTIVE" : "PAUSED",
            specialAdCategories: specialCats,
        };
        if (cbo) c.dailyBudgetCents = toCents(campBudget);
        return c;
    };
    const buildAdset = () => {
        const a: Record<string, unknown> = {
            name: adsetName.trim(),
            status: activate ? "ACTIVE" : "PAUSED",
            optimizationGoal,
            billingEvent: "IMPRESSIONS",
            targeting,
        };
        if (!cbo) a.dailyBudgetCents = toCents(adsetBudget);
        if (optimizationGoal === "OFFSITE_CONVERSIONS") a.promotedObject = { pixel_id: pixelId, custom_event_type: pixelEvent };
        if (optimizationGoal === "CONVERSATIONS") { a.destinationType = "WHATSAPP"; a.promotedObject = { page_id: pageId }; }
        if (optimizationGoal === "LEAD_GENERATION") a.promotedObject = { page_id: pageId };
        return a;
    };
    const buildAd = () => {
        const creative: Record<string, unknown> = creativeMode === "existing"
            ? { existingCreativeId: selectedCreativeId }
            : { pageId, link: linkUrl.trim(), message: primaryText, headline, description, ctaType: cta };
        return { name: adName.trim(), status: activate ? "ACTIVE" : "PAUSED", creative };
    };

    /* ── Validações por passo ── */
    const validateStep1 = (): string | null => {
        if (!selAccountId) return "Selecione a conta de anúncios.";
        if (!campName.trim()) return "Informe o nome da campanha.";
        if (cbo && toCents(campBudget) <= 0) return "Informe o orçamento diário da campanha (CBO).";
        return null;
    };
    const validateStep2 = (): string | null => {
        if (!adsetName.trim()) return "Informe o nome do conjunto.";
        if (!cbo && toCents(adsetBudget) <= 0) return "Informe o orçamento diário do conjunto.";
        if (optimizationGoal === "OFFSITE_CONVERSIONS" && !pixelId) return "Selecione o pixel de conversão.";
        if ((optimizationGoal === "CONVERSATIONS" || optimizationGoal === "LEAD_GENERATION") && !pageId) return "Selecione a página do Facebook.";
        if (!hasGeo) return "Adicione ao menos uma localização (país, estado ou cidade).";
        return null;
    };
    const validateStep3 = (): string | null => {
        if (!adName.trim()) return "Informe o nome do anúncio.";
        if (creativeMode === "existing") {
            if (!selectedCreativeId) return "Selecione um criativo existente.";
        } else {
            if (!pageId) return "Selecione ou informe o ID da página.";
            if (!linkUrl.trim()) return "Informe a URL de destino do anúncio.";
        }
        return null;
    };

    const goNext = () => {
        const err = step === 1 ? validateStep1() : validateStep2();
        if (err) { setStepError(err); return; }
        setStepError(null);
        setStep(prev => (prev === 1 ? 2 : 3));
    };
    const goTo = (s: 1 | 2 | 3) => {
        if (progress || s >= step) return;
        setStepError(null);
        setStep(s);
    };

    /* ── Validar (passo 3) ── */
    const handleValidate = async () => {
        const err = validateStep1();
        if (err) { setValidateMsg({ ok: false, text: err }); return; }
        setValidating(true); setValidateMsg(null);
        try {
            await postJson("/api/meugestor/manage/campaigns", { accountId: selAccountId, validateOnly: true, campaign: buildCampaign() });
            setValidateMsg({ ok: true, text: "Campanha válida ✓" });
            if (hasGeo) refreshEstimate();
        } catch (e) {
            setValidateMsg({ ok: false, text: e instanceof Error ? e.message : "Erro na validação" });
        }
        setValidating(false);
    };

    /* ── Criar (sequencial, com retomada em caso de falha parcial) ── */
    const handleCreate = async () => {
        for (const v of [validateStep1(), validateStep2(), validateStep3()]) {
            if (v) { setStepError(v); return; }
        }
        setStepError(null); setCreateError(null); setTosUrl(null); setValidateMsg(null);
        const ids = { ...createdIds };
        const campaignPayload = buildCampaign();
        const adsetPayload = buildAdset();
        /* Invalida objetos já criados se os dados correspondentes foram editados desde a criação:
           edições não seriam aplicadas ao objeto antigo, então ele é recriado com os novos dados */
        if (ids.campaignId && createdSnapRef.current.campaign !== JSON.stringify(campaignPayload)) {
            delete ids.campaignId;
            delete ids.adsetId;
        }
        if (ids.adsetId && createdSnapRef.current.adset !== JSON.stringify(adsetPayload)) {
            delete ids.adsetId;
        }
        setCreatedIds({ ...ids });
        const prog: Progress = {
            campaign: ids.campaignId ? "done" : "pending",
            adset: ids.adsetId ? "done" : "pending",
            ad: "pending",
        };
        setProgress({ ...prog });
        let phase: keyof Progress = "campaign";
        try {
            if (!ids.campaignId) {
                phase = "campaign";
                setProgress({ ...prog, campaign: "doing" });
                const j = await postJson("/api/meugestor/manage/campaigns", { accountId: selAccountId, campaign: campaignPayload });
                ids.campaignId = j.data?.id;
                createdSnapRef.current.campaign = JSON.stringify(campaignPayload);
                prog.campaign = "done";
                setCreatedIds({ ...ids }); setProgress({ ...prog });
            }
            if (!ids.adsetId) {
                phase = "adset";
                setProgress({ ...prog, adset: "doing" });
                const j = await postJson("/api/meugestor/manage/adsets", {
                    accountId: selAccountId,
                    adset: { ...adsetPayload, campaignId: ids.campaignId },
                });
                ids.adsetId = j.data?.id;
                createdSnapRef.current.adset = JSON.stringify(adsetPayload);
                prog.adset = "done";
                setCreatedIds({ ...ids }); setProgress({ ...prog });
            }
            phase = "ad";
            setProgress({ ...prog, ad: "doing" });
            const body: Record<string, unknown> = {
                accountId: selAccountId,
                ad: { ...buildAd(), adsetId: ids.adsetId },
            };
            if (creativeMode === "new" && imageBase64) {
                body.imageBase64 = imageBase64;
                body.imageName = imageName || "imagem.jpg";
            }
            const j = await postJson("/api/meugestor/manage/ads", body);
            ids.adId = j.data?.id;
            ids.creativeId = j.data?.creative_id;
            prog.ad = "done";
            setCreatedIds({ ...ids }); setProgress({ ...prog });
        } catch (e) {
            setProgress({ ...prog, [phase]: "error" });
            setCreateError(e instanceof Error ? e.message : "Erro desconhecido");
            const t = (e as Error & { tosUrl?: string })?.tosUrl;
            if (t) setTosUrl(t);
        }
    };

    /* Sequência de criação em andamento: bloqueia fechar o modal no meio das requisições */
    const creating = progress !== null && !finished && !createError;

    const handleClose = () => {
        if (creating) return;
        if (createdIds.campaignId) onCreated();
        if (!finished) {
            /* Fechou após falha parcial (ou sem criar): descarta os objetos parciais
               para não reaproveitá-los em uma criação futura sem relação com esta */
            setCreatedIds({}); setProgress(null); setCreateError(null); setTosUrl(null);
            createdSnapRef.current = {};
        }
        onClose();
    };
    const handleFinish = () => {
        onCreated();
        onClose();
    };

    /* ── Handlers de segmentação ── */
    const addGeo = (r: GeoResult) => {
        const label = `${r.name}${r.region ? `, ${r.region}` : ""}`;
        if (r.type === "country") {
            const code = r.country_code || r.key;
            if (!countries.includes(code)) setCountries([...countries, code]);
        } else if (r.type === "city" || r.type === "subcity" || r.type === "neighborhood") {
            if (!cities.some(c => c.key === r.key)) setCities([...cities, { key: r.key, name: label }]);
        } else {
            if (!regions.some(g => g.key === r.key)) setRegions([...regions, { key: r.key, name: label }]);
        }
        setGeoQuery(""); setGeoResults([]);
    };
    const addInterest = (r: InterestResult) => {
        if (!interests.some(i => i.id === r.id)) {
            setInterests([...interests, { id: r.id, name: r.name, size: r.audience_size_lower_bound ?? r.audience_size ?? 0 }]);
        }
        setInterestQuery(""); setInterestResults([]);
    };
    const toggleAudience = (id: string, kind: "inc" | "exc") => {
        if (kind === "inc") {
            setIncAud(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            setExcAud(prev => prev.filter(x => x !== id));
        } else {
            setExcAud(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            setIncAud(prev => prev.filter(x => x !== id));
        }
    };

    const onImageFile = (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = String(reader.result || "");
            setImagePreview(url);
            setImageBase64(url.split(",")[1] || "");
            setImageName(f.name);
        };
        reader.readAsDataURL(f);
        e.target.value = "";
    };

    const needsPageInStep2 = optimizationGoal === "CONVERSATIONS" || optimizationGoal === "LEAD_GENERATION";
    const goals = OPT_GOALS[objective];
    const STEP_LABELS = ["Campanha", "Conjunto", "Anúncio"];

    /* ── Seletor de página (reutilizado nos passos 2 e 3) ── */
    const pageSelector = (
        <Field label="Página do Facebook" hint="Selecione uma página da conta ou digite o ID manualmente.">
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <select
                    value={assets.pages.some(p => p.id === pageId) ? pageId : ""}
                    onChange={e => setPageId(e.target.value)}
                    style={{ ...inputSt, flex: 1, minWidth: 180 }}
                >
                    <option value="" style={optSt}>— selecionar página —</option>
                    {assets.pages.map(p => (
                        <option key={p.id} value={p.id} style={optSt}>{p.name || p.id}</option>
                    ))}
                </select>
                <input
                    value={pageId}
                    onChange={e => setPageId(e.target.value.trim())}
                    placeholder="ID da página"
                    style={{ ...inputSt, flex: 1, minWidth: 140, fontFamily: "monospace" }}
                />
            </div>
        </Field>
    );

    return (
        <div onClick={handleClose} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
            <div onClick={e => e.stopPropagation()} className="g-glass" style={{
                width: "min(760px, 96%)", maxHeight: "90vh", display: "flex", flexDirection: "column",
                overflow: "hidden", background: "rgba(15,18,37,0.98)", borderRadius: "1rem",
                border: "1px solid var(--glass-border)", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}>
                {/* ── Cabeçalho ── */}
                <div style={{ padding: "1.1rem 1.5rem 0.9rem", borderBottom: "1px solid var(--glass-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div style={{ width: 34, height: 34, borderRadius: "0.6rem", background: "rgba(76,110,245,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Rocket style={{ width: 17, height: 17, color: "#748ffc" }} />
                            </div>
                            <div>
                                <h3 style={{ color: "white", fontSize: "1rem", fontWeight: 700, margin: 0 }}>Criar Campanha</h3>
                                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", margin: 0 }}>Campanha, conjunto e anúncio em 3 passos</p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={creating} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: creating ? "default" : "pointer", opacity: creating ? 0.35 : 1 }}>
                            <X style={{ width: 18, height: 18 }} />
                        </button>
                    </div>

                    {/* Indicador de passos */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.9rem" }}>
                        {STEP_LABELS.map((label, i) => {
                            const n = (i + 1) as 1 | 2 | 3;
                            const active = n === step;
                            const done = n < step;
                            const clickable = done && !progress;
                            return (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: i < 2 ? "0 0 auto" : undefined }}>
                                    <button
                                        type="button"
                                        onClick={() => goTo(n)}
                                        style={{
                                            display: "inline-flex", alignItems: "center", gap: "0.4rem",
                                            background: active ? "rgba(76,110,245,0.18)" : "none",
                                            border: `1px solid ${active ? "rgba(76,110,245,0.5)" : "transparent"}`,
                                            borderRadius: 999, padding: "0.25rem 0.7rem 0.25rem 0.3rem",
                                            cursor: clickable ? "pointer" : "default",
                                        }}
                                    >
                                        <span style={{
                                            width: 20, height: 20, borderRadius: "50%", fontSize: "0.68rem", fontWeight: 700,
                                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                                            background: done ? "#34d399" : active ? "#4c6ef5" : "rgba(255,255,255,0.1)",
                                            color: done || active ? "#0f1225" : "rgba(255,255,255,0.5)",
                                        }}>
                                            {done ? <Check style={{ width: 12, height: 12 }} /> : n}
                                        </span>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: active ? "white" : done ? "#34d399" : "rgba(255,255,255,0.4)" }}>
                                            {label}
                                        </span>
                                    </button>
                                    {i < 2 && <ChevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.25)" }} />}
                                </div>
                            );
                        })}
                        {assetsLoading && (
                            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.66rem", color: "rgba(255,255,255,0.4)" }}>
                                <Loader2 className="g-pulse" style={{ width: 12, height: 12 }} /> Carregando ativos…
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Corpo ── */}
                <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.5rem 1.4rem" }}>

                    {/* ══ Painel de criação (progresso / resultado) ══ */}
                    {progress ? (
                        <div className="g-fade-in">
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <StepRow state={progress.campaign} label="Criando campanha" id={createdIds.campaignId} />
                                <StepRow state={progress.adset} label="Criando conjunto de anúncios" id={createdIds.adsetId} />
                                <StepRow state={progress.ad} label="Criando anúncio" id={createdIds.adId} />
                            </div>

                            {finished && (
                                <div style={{ marginTop: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(52,211,153,0.35)" }}>
                                    <p style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#34d399", fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>
                                        <Check style={{ width: 16, height: 16 }} /> Campanha criada com sucesso!
                                    </p>
                                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", margin: "0.4rem 0 0" }}>
                                        {activate
                                            ? "Todos os objetos foram criados com status ATIVO e já podem começar a veicular."
                                            : "Todos os objetos foram criados PAUSADOS. Ative-os quando estiver pronto."}
                                        {createdIds.creativeId && <> Criativo: <span style={{ fontFamily: "monospace" }}>{createdIds.creativeId}</span></>}
                                    </p>
                                </div>
                            )}

                            {createError && (
                                <div style={{ marginTop: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(248,113,113,0.35)" }}>
                                    <p style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#f87171", fontWeight: 700, fontSize: "0.82rem", margin: 0 }}>
                                        <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> Falha em uma das etapas
                                    </p>
                                    <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", margin: "0.4rem 0 0" }}>{createError}</p>
                                    {tosUrl && (
                                        <a href={tosUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#748ffc", textDecoration: "none", marginTop: "0.4rem", fontWeight: 600, fontSize: "0.72rem" }}>
                                            Aceitar os Termos de Públicos Personalizados <ExternalLink style={{ width: 11, height: 11 }} />
                                        </a>
                                    )}
                                    {(createdIds.campaignId || createdIds.adsetId) && (
                                        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", margin: "0.5rem 0 0" }}>
                                            Objetos já criados serão reaproveitados ao tentar novamente; se você editar os dados, eles serão recriados
                                            {createdIds.campaignId && <> · Campanha <span style={{ fontFamily: "monospace" }}>{createdIds.campaignId}</span></>}
                                            {createdIds.adsetId && <> · Conjunto <span style={{ fontFamily: "monospace" }}>{createdIds.adsetId}</span></>}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* ══ PASSO 1 — Campanha ══ */}
                            {step === 1 && (
                                <div className="g-fade-in">
                                    <Field label="Conta de anúncios">
                                        <select value={selAccountId} onChange={e => setSelAccountId(e.target.value)} style={inputSt}>
                                            <option value="" style={optSt}>— selecione a conta —</option>
                                            {accounts.map(a => (
                                                <option key={a.id} value={a.id} style={optSt}>{a.name}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Nome da campanha">
                                        <input value={campName} onChange={e => setCampName(e.target.value)} placeholder="Ex.: [VENDAS] Lançamento Julho" style={inputSt} />
                                    </Field>

                                    <Field label="Objetivo">
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem" }}>
                                            {OBJECTIVES.map(o => {
                                                const on = objective === o.value;
                                                const Icon = o.icon;
                                                return (
                                                    <button key={o.value} type="button" onClick={() => setObjective(o.value)} style={{
                                                        display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.7rem 0.8rem",
                                                        borderRadius: "0.65rem", cursor: "pointer", textAlign: "left",
                                                        background: on ? "rgba(76,110,245,0.18)" : "rgba(255,255,255,0.03)",
                                                        border: `1px solid ${on ? "rgba(76,110,245,0.55)" : "rgba(255,255,255,0.08)"}`,
                                                    }}>
                                                        <Icon style={{ width: 16, height: 16, color: on ? "#748ffc" : "rgba(255,255,255,0.45)", flexShrink: 0 }} />
                                                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: on ? "white" : "rgba(255,255,255,0.7)" }}>{o.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Field>

                                    <div style={{ marginBottom: "0.9rem" }}>
                                        <Toggle
                                            on={cbo}
                                            onToggle={() => setCbo(!cbo)}
                                            label="Orçamento na campanha (CBO)"
                                            hint="A Meta distribui o orçamento automaticamente entre os conjuntos."
                                        />
                                    </div>
                                    {cbo && (
                                        <Field label="Orçamento diário da campanha" hint="Valor em reais por dia.">
                                            <MoneyInput value={campBudget} onChange={setCampBudget} />
                                        </Field>
                                    )}

                                    <Field label="Categoria especial" hint="Obrigatório apenas para anúncios de crédito, emprego, habitação, política ou finanças.">
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                            {SPECIAL_CATS.map(c => {
                                                const on = specialCats.includes(c.value);
                                                return (
                                                    <button key={c.value} type="button"
                                                        onClick={() => setSpecialCats(on ? specialCats.filter(x => x !== c.value) : [...specialCats, c.value])}
                                                        style={{
                                                            display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.7rem",
                                                            borderRadius: 999, cursor: "pointer", fontSize: "0.73rem", fontWeight: 600,
                                                            background: on ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.04)",
                                                            border: `1px solid ${on ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                                                            color: on ? "#fbbf24" : "rgba(255,255,255,0.6)",
                                                        }}>
                                                        {on && <Check style={{ width: 11, height: 11 }} />}{c.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Field>
                                </div>
                            )}

                            {/* ══ PASSO 2 — Conjunto ══ */}
                            {step === 2 && (
                                <div className="g-fade-in">
                                    <div className="g-grid-2col">
                                        <Field label="Nome do conjunto">
                                            <input
                                                value={adsetName}
                                                onChange={e => { setAdsetName(e.target.value); setAdsetNameTouched(true); }}
                                                style={inputSt}
                                            />
                                        </Field>
                                        {!cbo ? (
                                            <Field label="Orçamento diário do conjunto">
                                                <MoneyInput value={adsetBudget} onChange={setAdsetBudget} />
                                            </Field>
                                        ) : (
                                            <Field label="Orçamento">
                                                <div style={{ ...inputSt, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                                                    Definido na campanha (CBO): R$ {campBudget || "0"} / dia
                                                </div>
                                            </Field>
                                        )}
                                    </div>

                                    <Field label="Otimização da entrega">
                                        <select value={optimizationGoal} onChange={e => setOptimizationGoal(e.target.value)} style={inputSt}>
                                            {goals.map(g => (
                                                <option key={g.value} value={g.value} style={optSt}>{g.label}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    {optimizationGoal === "OFFSITE_CONVERSIONS" && (
                                        <div className="g-grid-2col">
                                            <Field label="Pixel de conversão">
                                                <select value={pixelId} onChange={e => setPixelId(e.target.value)} style={inputSt}>
                                                    <option value="" style={optSt}>— selecionar pixel —</option>
                                                    {assets.pixels.map(p => (
                                                        <option key={p.id} value={p.id} style={optSt}>{p.name || p.id}</option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Evento de conversão">
                                                <select value={pixelEvent} onChange={e => setPixelEvent(e.target.value)} style={inputSt}>
                                                    {PIXEL_EVENTS.map(ev => (
                                                        <option key={ev.value} value={ev.value} style={optSt}>{ev.label}</option>
                                                    ))}
                                                </select>
                                            </Field>
                                        </div>
                                    )}

                                    {needsPageInStep2 && pageSelector}

                                    {/* ── Segmentação ── */}
                                    <p style={sectionSt}><Target style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />Segmentação</p>

                                    <Field label="Localizações" hint="Busque países, estados ou cidades. Cidades usam raio de 40 km.">
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                                            {countries.map(c => (
                                                <Chip key={`co-${c}`} label={`País: ${c}`} onRemove={() => setCountries(countries.filter(x => x !== c))} />
                                            ))}
                                            {regions.map(r => (
                                                <Chip key={`re-${r.key}`} label={r.name} onRemove={() => setRegions(regions.filter(x => x.key !== r.key))} />
                                            ))}
                                            {cities.map(c => (
                                                <Chip key={`ci-${c.key}`} label={`${c.name} +40km`} onRemove={() => setCities(cities.filter(x => x.key !== c.key))} />
                                            ))}
                                        </div>
                                        <div style={{ position: "relative" }}>
                                            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.3)" }} />
                                            <input
                                                value={geoQuery}
                                                onChange={e => setGeoQuery(e.target.value)}
                                                placeholder="Buscar cidade, estado ou país…"
                                                style={{ ...inputSt, paddingLeft: "2rem" }}
                                            />
                                            {geoLoading && <Loader2 className="g-pulse" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#748ffc" }} />}
                                            {geoResults.length > 0 && (
                                                <div style={dropdownSt}>
                                                    {geoResults.map(r => {
                                                        const badge = GEO_TYPE_LABEL[r.type] || { label: r.type, cls: "g-badge-info" };
                                                        return (
                                                            <button key={`${r.type}-${r.key}`} type="button" onClick={() => addGeo(r)} style={{
                                                                display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", textAlign: "left",
                                                                padding: "0.5rem 0.75rem", background: "none", border: "none",
                                                                borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", color: "white", fontSize: "0.76rem",
                                                            }}>
                                                                <span className={`g-badge ${badge.cls}`} style={{ fontSize: "0.62rem", flexShrink: 0 }}>{badge.label}</span>
                                                                <span>{r.name}{r.region ? `, ${r.region}` : ""}{r.country_name ? ` – ${r.country_name}` : ""}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </Field>

                                    <div className="g-grid-2col">
                                        <Field label="Idade">
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <select
                                                    value={ageMin}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        setAgeMin(v);
                                                        if (v > ageMax) setAgeMax(v);
                                                    }}
                                                    style={inputSt}
                                                >
                                                    {Array.from({ length: 48 }, (_, i) => 18 + i).map(a => (
                                                        <option key={a} value={a} style={optSt}>{a === 65 ? "65+" : a}</option>
                                                    ))}
                                                </select>
                                                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>a</span>
                                                <select value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} style={inputSt}>
                                                    {Array.from({ length: 48 }, (_, i) => 18 + i).filter(a => a >= ageMin).map(a => (
                                                        <option key={a} value={a} style={optSt}>{a === 65 ? "65+" : a}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </Field>
                                        <Field label="Gênero">
                                            <div style={{ display: "flex", gap: "0.4rem" }}>
                                                {[
                                                    { label: "Todos", value: [] as number[] },
                                                    { label: "Homens", value: [1] },
                                                    { label: "Mulheres", value: [2] },
                                                ].map(g => {
                                                    const on = JSON.stringify(genders) === JSON.stringify(g.value);
                                                    return (
                                                        <button key={g.label} type="button" onClick={() => setGenders(g.value)} style={{
                                                            flex: 1, padding: "0.5rem 0.4rem", borderRadius: "0.55rem", cursor: "pointer",
                                                            fontSize: "0.74rem", fontWeight: 600,
                                                            background: on ? "rgba(76,110,245,0.18)" : "rgba(255,255,255,0.03)",
                                                            border: `1px solid ${on ? "rgba(76,110,245,0.55)" : "rgba(255,255,255,0.1)"}`,
                                                            color: on ? "white" : "rgba(255,255,255,0.6)",
                                                        }}>
                                                            {g.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Field>
                                    </div>

                                    <Field label="Interesses" hint="Deixe vazio para público amplo.">
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: interests.length ? "0.5rem" : 0 }}>
                                            {interests.map(i => (
                                                <Chip
                                                    key={i.id}
                                                    label={i.size > 0 ? `${i.name} · ${fmtCompact.format(i.size)}` : i.name}
                                                    onRemove={() => setInterests(interests.filter(x => x.id !== i.id))}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ position: "relative" }}>
                                            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.3)" }} />
                                            <input
                                                value={interestQuery}
                                                onChange={e => setInterestQuery(e.target.value)}
                                                placeholder="Buscar interesses (ex.: fitness, marketing)…"
                                                style={{ ...inputSt, paddingLeft: "2rem" }}
                                            />
                                            {interestLoading && <Loader2 className="g-pulse" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#748ffc" }} />}
                                            {interestResults.length > 0 && (
                                                <div style={dropdownSt}>
                                                    {interestResults.map(r => {
                                                        const size = r.audience_size_lower_bound ?? r.audience_size ?? 0;
                                                        return (
                                                            <button key={r.id} type="button" onClick={() => addInterest(r)} style={{
                                                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
                                                                width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", background: "none", border: "none",
                                                                borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", color: "white", fontSize: "0.76rem",
                                                            }}>
                                                                <span>{r.name}</span>
                                                                {size > 0 && <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{fmtCompact.format(size)} pessoas</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </Field>

                                    <Field label="Públicos personalizados">
                                        {audiences.length === 0 ? (
                                            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>Nenhum público encontrado nesta conta.</p>
                                        ) : (
                                            <div className="g-grid-2col">
                                                {(["inc", "exc"] as const).map(kind => (
                                                    <div key={kind}>
                                                        <p style={{ fontSize: "0.66rem", fontWeight: 700, color: kind === "inc" ? "#34d399" : "#f87171", margin: "0 0 0.3rem" }}>
                                                            {kind === "inc" ? "Incluir" : "Excluir"}
                                                        </p>
                                                        <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", background: "rgba(0,0,0,0.25)" }}>
                                                            {audiences.map(a => {
                                                                const on = (kind === "inc" ? incAud : excAud).includes(a.id);
                                                                const count = a.approximate_count_lower_bound ?? a.approximate_count;
                                                                return (
                                                                    <button key={a.id} type="button" onClick={() => toggleAudience(a.id, kind)} style={{
                                                                        display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", textAlign: "left",
                                                                        padding: "0.4rem 0.55rem", background: on ? (kind === "inc" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)") : "none",
                                                                        border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer",
                                                                    }}>
                                                                        <span style={{
                                                                            width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                                                                            background: on ? (kind === "inc" ? "#34d399" : "#f87171") : "transparent",
                                                                            border: `1px solid ${on ? "transparent" : "rgba(255,255,255,0.25)"}`,
                                                                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                                        }}>
                                                                            {on && <Check style={{ width: 9, height: 9, color: "#0f1225" }} />}
                                                                        </span>
                                                                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                            {a.name}
                                                                        </span>
                                                                        {count !== undefined && count > 0 && (
                                                                            <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{fmtCompact.format(count)}</span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Field>

                                    <div style={{ marginBottom: "1rem" }}>
                                        <Toggle
                                            on={advantage}
                                            onToggle={() => setAdvantage(!advantage)}
                                            label="Público Advantage+ (expansão automática)"
                                            hint="A Meta pode expandir a segmentação além dos critérios definidos."
                                        />
                                    </div>

                                    {/* Estimativa de alcance */}
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.75rem 0.9rem",
                                        borderRadius: "0.7rem", background: "rgba(76,110,245,0.08)", border: "1px solid rgba(76,110,245,0.25)",
                                    }}>
                                        <Users style={{ width: 16, height: 16, color: "#748ffc", flexShrink: 0 }} />
                                        {estLoading ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.76rem", color: "rgba(255,255,255,0.6)" }}>
                                                <Loader2 className="g-pulse" style={{ width: 13, height: 13 }} /> Calculando alcance…
                                            </span>
                                        ) : estimate ? (
                                            <span style={{ fontSize: "0.78rem", color: "white", fontWeight: 600 }}>
                                                Alcance estimado:{" "}
                                                {estimate.lower !== null && estimate.upper !== null
                                                    ? `${fmtCompact.format(estimate.lower)} – ${fmtCompact.format(estimate.upper)}`
                                                    : `≈ ${fmtCompact.format(estimate.lower ?? estimate.upper ?? 0)}`}{" "}
                                                pessoas
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.45)" }}>
                                                Ajuste a segmentação para ver o alcance estimado.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ══ PASSO 3 — Anúncio ══ */}
                            {step === 3 && (
                                <div className="g-fade-in">
                                    <Field label="Nome do anúncio">
                                        <input
                                            value={adName}
                                            onChange={e => { setAdName(e.target.value); setAdNameTouched(true); }}
                                            style={inputSt}
                                        />
                                    </Field>

                                    {pageSelector}

                                    {/* Abas de modo */}
                                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.9rem" }}>
                                        {([
                                            { key: "existing", label: "Usar criativo existente" },
                                            { key: "new", label: "Criar novo" },
                                        ] as const).map(t => {
                                            const on = creativeMode === t.key;
                                            return (
                                                <button key={t.key} type="button" onClick={() => setCreativeMode(t.key)} style={{
                                                    flex: 1, padding: "0.55rem 0.6rem", borderRadius: "0.6rem", cursor: "pointer",
                                                    fontSize: "0.78rem", fontWeight: 600,
                                                    background: on ? "rgba(76,110,245,0.18)" : "rgba(255,255,255,0.03)",
                                                    border: `1px solid ${on ? "rgba(76,110,245,0.55)" : "rgba(255,255,255,0.1)"}`,
                                                    color: on ? "white" : "rgba(255,255,255,0.55)",
                                                }}>
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {creativeMode === "existing" ? (
                                        assets.creatives.length === 0 ? (
                                            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", padding: "1rem 0", textAlign: "center" }}>
                                                Nenhum criativo encontrado nesta conta. Use a aba “Criar novo”.
                                            </p>
                                        ) : (
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "0.9rem" }}>
                                                {assets.creatives.map(c => {
                                                    const on = selectedCreativeId === c.id;
                                                    return (
                                                        <button key={c.id} type="button" onClick={() => setSelectedCreativeId(c.id)} style={{
                                                            padding: 0, borderRadius: "0.6rem", overflow: "hidden", cursor: "pointer", textAlign: "left",
                                                            background: on ? "rgba(76,110,245,0.18)" : "rgba(255,255,255,0.03)",
                                                            border: `2px solid ${on ? "#4c6ef5" : "rgba(255,255,255,0.08)"}`,
                                                        }}>
                                                            <div style={{ height: 78, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                                                {c.thumbnail_url ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={c.thumbnail_url} alt={c.name || c.id} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                ) : (
                                                                    <ImageIcon style={{ width: 20, height: 20, color: "rgba(255,255,255,0.25)" }} />
                                                                )}
                                                            </div>
                                                            <div style={{ padding: "0.35rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                                {on && <Check style={{ width: 11, height: 11, color: "#748ffc", flexShrink: 0 }} />}
                                                                <span style={{ fontSize: "0.66rem", color: on ? "white" : "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    {c.name || c.id}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            <Field label="URL de destino">
                                                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://seusite.com.br/oferta" style={inputSt} />
                                            </Field>
                                            <Field label="Texto principal">
                                                <textarea
                                                    value={primaryText}
                                                    onChange={e => setPrimaryText(e.target.value)}
                                                    rows={3}
                                                    placeholder="Texto que aparece acima do criativo…"
                                                    style={{ ...inputSt, resize: "vertical", fontFamily: "inherit" }}
                                                />
                                            </Field>
                                            <div className="g-grid-2col">
                                                <Field label="Título">
                                                    <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Título em destaque" style={inputSt} />
                                                </Field>
                                                <Field label="Descrição">
                                                    <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional" style={inputSt} />
                                                </Field>
                                            </div>
                                            <div className="g-grid-2col">
                                                <Field label="Botão (CTA)">
                                                    <select value={cta} onChange={e => setCta(e.target.value)} style={inputSt}>
                                                        {CTAS.map(c => (
                                                            <option key={c.value} value={c.value} style={optSt}>{c.label}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Imagem do anúncio">
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                                        <label className="g-btn-secondary" style={{ padding: "0.45rem 0.8rem", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
                                                            <Upload style={{ width: 13, height: 13 }} />
                                                            {imageName ? "Trocar imagem" : "Enviar imagem"}
                                                            <input type="file" accept="image/*" onChange={onImageFile} style={{ display: "none" }} />
                                                        </label>
                                                        {imagePreview && (
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={imagePreview} alt={imageName} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: "0.4rem", border: "1px solid rgba(255,255,255,0.15)" }} />
                                                                <button type="button" onClick={() => { setImageBase64(""); setImageName(""); setImagePreview(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", display: "inline-flex" }}>
                                                                    <X style={{ width: 13, height: 13 }} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Field>
                                            </div>
                                        </>
                                    )}

                                    <div style={{ marginTop: "0.4rem" }}>
                                        <Toggle
                                            on={activate}
                                            onToggle={() => setActivate(!activate)}
                                            label="Ativar campanha imediatamente"
                                            hint="Desligado: tudo é criado PAUSADO para revisão (recomendado)."
                                        />
                                    </div>

                                    {(validateMsg || estimate) && (
                                        <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                            {validateMsg && (
                                                <p style={{
                                                    display: "flex", alignItems: "center", gap: "0.4rem", margin: 0,
                                                    fontSize: "0.76rem", fontWeight: 600,
                                                    color: validateMsg.ok ? "#34d399" : "#f87171",
                                                }}>
                                                    {validateMsg.ok ? <Check style={{ width: 14, height: 14 }} /> : <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />}
                                                    {validateMsg.text}
                                                </p>
                                            )}
                                            {estimate && (
                                                <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>
                                                    Alcance estimado:{" "}
                                                    {estimate.lower !== null && estimate.upper !== null
                                                        ? `${fmtInt.format(estimate.lower)} – ${fmtInt.format(estimate.upper)}`
                                                        : fmtInt.format(estimate.lower ?? estimate.upper ?? 0)}{" "}
                                                    pessoas
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Rodapé ── */}
                <div style={{ padding: "0.85rem 1.5rem", borderTop: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {stepError && !progress && (
                            <p style={{ display: "flex", alignItems: "center", gap: "0.35rem", margin: 0, fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }}>
                                <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} /> {stepError}
                            </p>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                        {progress ? (
                            finished ? (
                                <button onClick={handleFinish} className="g-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                                    <Check style={{ width: 15, height: 15 }} /> Concluir
                                </button>
                            ) : createError ? (
                                <>
                                    <button onClick={() => { setProgress(null); setCreateError(null); setTosUrl(null); }} className="g-btn-secondary" style={{ fontSize: "0.78rem" }}>
                                        Voltar e ajustar
                                    </button>
                                    <button onClick={handleCreate} className="g-btn-primary" style={{ fontSize: "0.78rem" }}>
                                        Tentar novamente
                                    </button>
                                </>
                            ) : (
                                <button disabled className="g-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", opacity: 0.7, cursor: "default" }}>
                                    <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} /> Criando…
                                </button>
                            )
                        ) : step < 3 ? (
                            <>
                                {step > 1 && (
                                    <button onClick={() => goTo((step - 1) as 1 | 2)} className="g-btn-secondary" style={{ fontSize: "0.78rem" }}>
                                        Voltar
                                    </button>
                                )}
                                <button onClick={goNext} className="g-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}>
                                    Continuar <ChevronRight style={{ width: 14, height: 14 }} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => goTo(2)} className="g-btn-secondary" style={{ fontSize: "0.78rem" }}>
                                    Voltar
                                </button>
                                <button onClick={handleValidate} disabled={validating} className="g-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", opacity: validating ? 0.7 : 1 }}>
                                    {validating ? <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} /> : <Check style={{ width: 14, height: 14 }} />}
                                    Validar
                                </button>
                                <button onClick={handleCreate} className="g-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                                    <Rocket style={{ width: 14, height: 14 }} /> Criar campanha
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
