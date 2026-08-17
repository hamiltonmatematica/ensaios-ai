"use client";
import { useState, useEffect } from "react";
import { Globe, Check, X, Trash2, PlugZap, Loader2, CircleCheck, CircleAlert, Plus, Link2, Unlink } from "lucide-react";

export interface GoogleAdsConfig {
    sheetCsvUrls: string[];
    campaignSheetCsvUrls: string[];
}

export const EMPTY_GOOGLE_ADS_CONFIG: GoogleAdsConfig = { sheetCsvUrls: [], campaignSheetCsvUrls: [] };

function cleanUrlArray(raw: any): string[] {
    return Array.isArray(raw) ? raw.filter((u: any) => typeof u === "string" && u.trim()).map((u: string) => u.trim()) : [];
}

/**
 * Normaliza o que veio do localStorage pro formato atual — inclui migrar
 * formatos antigos (sheetCsvUrl: string, de antes do multi-MCC; sheetCsvUrls
 * sem campaignSheetCsvUrls, de antes do drill-down) e blindar contra
 * qualquer shape inesperado/corrompido, pra nunca deixar um desses arrays
 * undefined estourar em .length/.join/.map.
 */
export function normalizeGoogleAdsConfig(raw: any): GoogleAdsConfig {
    if (!raw || typeof raw !== "object") return EMPTY_GOOGLE_ADS_CONFIG;
    const sheetCsvUrls = Array.isArray(raw.sheetCsvUrls)
        ? cleanUrlArray(raw.sheetCsvUrls)
        : (typeof raw.sheetCsvUrl === "string" && raw.sheetCsvUrl.trim() ? [raw.sheetCsvUrl.trim()] : []);
    const campaignSheetCsvUrls = cleanUrlArray(raw.campaignSheetCsvUrls);
    return { sheetCsvUrls, campaignSheetCsvUrls };
}

interface Props {
    open: boolean;
    onClose: () => void;
    currentConfig: GoogleAdsConfig;
    onSave: (config: GoogleAdsConfig) => void;
    onClear: () => void;
}

interface SheetSummary { rowCount: number; accountCount: number; dateFrom: string | null; dateTo: string | null; }
interface PerSheetResult extends SheetSummary { url: string; error: string | null; }

type TestResult =
    | { ok: true; accounts: SheetSummary & { accountNames: string[]; perSheet: PerSheetResult[] }; campaigns: SheetSummary & { perSheet: PerSheetResult[] } }
    | { ok: false; error: string };

function UrlListEditor({ label, hint, urls, setUrls }: { label: string; hint: string; urls: string[]; setUrls: (u: string[]) => void }) {
    return (
        <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.35rem", fontWeight: 600 }}>
                {label}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {urls.map((url, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.4rem" }}>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrls(urls.map((u, j) => j === i ? e.target.value : u))}
                            placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                            style={{
                                flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "0.5rem", padding: "0.6rem 0.75rem", color: "white", fontSize: "0.8rem",
                                fontFamily: "monospace", outline: "none", boxSizing: "border-box",
                            }}
                        />
                        {urls.length > 1 && (
                            <button onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                                title="Remover" className="g-btn-secondary" style={{ padding: "0.5rem", display: "inline-flex" }}>
                                <X style={{ width: 14, height: 14 }} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <button onClick={() => setUrls([...urls, ""])} className="g-btn-secondary"
                style={{ marginTop: "0.5rem", padding: "0.4rem 0.7rem", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Plus style={{ width: 12, height: 12 }} /> Adicionar outra planilha
            </button>
            <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginTop: "0.5rem" }}>{hint}</p>
        </div>
    );
}

type ApiStatus =
    | { state: "loading" }
    | { state: "disconnected" }
    | { state: "connected"; accessibleCustomerIds: string[]; resolvedAccounts: string[] }
    | { state: "error"; error: string };

function ApiConnectionSection({ open }: { open: boolean }) {
    const [status, setStatus] = useState<ApiStatus>({ state: "loading" });
    const [disconnecting, setDisconnecting] = useState(false);

    const refresh = async () => {
        setStatus({ state: "loading" });
        try {
            const res = await fetch("/api/meugestor/gads-api/status");
            const json = await res.json();
            if (!json.success) { setStatus({ state: "error", error: json.error || "Falha ao checar conexão" }); return; }
            if (!json.data.connected) { setStatus({ state: "disconnected" }); return; }
            setStatus({ state: "connected", accessibleCustomerIds: json.data.accessibleCustomerIds, resolvedAccounts: json.data.resolvedAccounts });
        } catch (e: any) {
            setStatus({ state: "error", error: e.message || "Falha de rede" });
        }
    };

    useEffect(() => { if (open) refresh(); }, [open]);

    const handleDisconnect = async () => {
        if (!confirm("Desconectar a API oficial do Google Ads? Você pode reconectar quando quiser.")) return;
        setDisconnecting(true);
        try {
            await fetch("/api/meugestor/gads-api/status", { method: "DELETE" });
            await refresh();
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div style={{ background: "rgba(76,110,245,0.06)", border: "1px solid rgba(76,110,245,0.2)", borderRadius: "0.5rem", padding: "0.85rem", marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "white", fontSize: "0.8rem" }}>Conexão direta via API oficial (beta)</p>

            {status.state === "loading" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                    <Loader2 className="g-pulse" style={{ width: 13, height: 13 }} /> Checando conexão...
                </div>
            )}

            {status.state === "disconnected" && (
                <>
                    <p style={{ margin: "0 0 0.6rem", color: "rgba(255,255,255,0.6)", fontSize: "0.72rem" }}>
                        Login direto com o Google (igual o Reportei) — sem colar planilha. Requer o app do ensaios.ai aprovado pelo Google e o developer token com acesso Básico; até lá, a conexão funciona mas só enxerga contas de teste.
                    </p>
                    <a href="/api/auth/google-ads/connect" className="g-btn-primary"
                        style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}>
                        <Link2 style={{ width: 13, height: 13 }} /> Conectar Google Ads
                    </a>
                </>
            )}

            {status.state === "connected" && (
                <>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", color: "#34d399", fontSize: "0.75rem", marginBottom: "0.6rem" }}>
                        <CircleCheck style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                        <span>Conectado — {status.accessibleCustomerIds.length} contas acessíveis, {status.resolvedAccounts.length} resolvidas na hierarquia.</span>
                    </div>
                    <button onClick={handleDisconnect} disabled={disconnecting} className="g-btn-secondary"
                        style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)", padding: "0.4rem 0.7rem", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        <Unlink style={{ width: 12, height: 12 }} /> {disconnecting ? "Desconectando..." : "Desconectar"}
                    </button>
                </>
            )}

            {status.state === "error" && (
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", color: "#f87171", fontSize: "0.75rem" }}>
                    <CircleAlert style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                    <span>{status.error}</span>
                </div>
            )}
        </div>
    );
}

export default function GoogleAdsTokenModal({ open, onClose, currentConfig, onSave, onClear }: Props) {
    const [urls, setUrls] = useState<string[]>(currentConfig.sheetCsvUrls.length ? currentConfig.sheetCsvUrls : [""]);
    const [campaignUrls, setCampaignUrls] = useState<string[]>(currentConfig.campaignSheetCsvUrls.length ? currentConfig.campaignSheetCsvUrls : [""]);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    useEffect(() => {
        setUrls(currentConfig.sheetCsvUrls.length ? currentConfig.sheetCsvUrls : [""]);
        setCampaignUrls(currentConfig.campaignSheetCsvUrls.length ? currentConfig.campaignSheetCsvUrls : [""]);
        setTestResult(null);
    }, [currentConfig, open]);

    if (!open) return null;

    const isConfigured = currentConfig.sheetCsvUrls.length > 0 || currentConfig.campaignSheetCsvUrls.length > 0;
    const cleanUrls = urls.map(u => u.trim()).filter(Boolean);
    const cleanCampaignUrls = campaignUrls.map(u => u.trim()).filter(Boolean);

    const handleSave = () => {
        onSave({ sheetCsvUrls: cleanUrls, campaignSheetCsvUrls: cleanCampaignUrls });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClear = () => {
        setUrls([""]);
        setCampaignUrls([""]);
        setTestResult(null);
        onClear();
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const headers: Record<string, string> = {};
            if (cleanUrls.length) headers["x-google-ads-sheet-urls"] = cleanUrls.join(",");
            if (cleanCampaignUrls.length) headers["x-google-ads-campaign-sheet-urls"] = cleanCampaignUrls.join(",");

            const res = await fetch("/api/meugestor/gads/test", { headers });
            const json = await res.json();
            if (json.success) {
                setTestResult({ ok: true, ...json.data });
            } else {
                setTestResult({ ok: false, error: json.error || "Falha desconhecida" });
            }
        } catch (e: any) {
            setTestResult({ ok: false, error: e.message || "Falha de rede ao testar as planilhas" });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div onClick={onClose} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
            <div onClick={e => e.stopPropagation()} className="g-glass" style={{
                width: "min(600px, 95%)", maxHeight: "90vh", overflowY: "auto", background: "rgba(15,18,37,0.98)", borderRadius: "1rem",
                border: "1px solid var(--glass-border)", padding: "1.5rem", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "0.5rem", background: "rgba(76,110,245,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Globe style={{ width: 16, height: 16, color: "#748ffc" }} />
                        </div>
                        <div>
                            <h3 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>Configuração Google Ads</h3>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", margin: 0 }}>API oficial (beta) ou planilha exportada</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                <ApiConnectionSection open={open} />

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem", marginBottom: "0.75rem" }}>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Alternativa: planilha exportada (sem esperar aprovação do Google)
                    </p>
                </div>

                <UrlListEditor
                    label="Planilhas de CONTAS — aba &quot;dados&quot; (uma por MCC)"
                    hint="Totais diários por conta, histórico longo (~13 meses) — alimenta a lista principal de contas e os comparativos de período."
                    urls={urls}
                    setUrls={setUrls}
                />

                <UrlListEditor
                    label="Planilhas de CAMPANHAS — aba &quot;campanhas&quot; (opcional, uma por MCC)"
                    hint="Detalhe por campanha/grupo de anúncios, histórico mais curto (~3 meses) — alimenta o drill-down ao clicar numa conta Google. Pode deixar em branco se só quiser o total da conta."
                    urls={campaignUrls}
                    setUrls={setCampaignUrls}
                />

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "1.25rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "white" }}>Como conseguir essas URLs?</p>
                    <p style={{ margin: "0.3rem 0 0" }}>Passo a passo completo em GOOGLE_ADS_SETUP.md — um Google Ads Script (scripts/google-ads-export.gs) exporta os dados de cada MCC pra uma Google Sheets (abas "dados" e "campanhas"), que você publica na web como CSV.</p>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                    <button
                        onClick={handleTest}
                        disabled={testing || (cleanUrls.length === 0 && cleanCampaignUrls.length === 0)}
                        className="g-btn-secondary"
                        style={{ width: "100%", justifyContent: "center", padding: "0.6rem", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", opacity: (testing || (cleanUrls.length === 0 && cleanCampaignUrls.length === 0)) ? 0.5 : 1 }}
                    >
                        {testing ? <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} /> : <PlugZap style={{ width: 14, height: 14 }} />}
                        {testing ? "Testando..." : "Testar planilhas"}
                    </button>

                    {testResult && (
                        <div style={{
                            marginTop: "0.6rem", borderRadius: "0.5rem", padding: "0.65rem 0.75rem", fontSize: "0.72rem",
                            background: testResult.ok ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                            border: `1px solid ${testResult.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                            color: testResult.ok ? "#34d399" : "#f87171",
                        }}>
                            {testResult.ok ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                    <div>
                                        <p style={{ margin: "0 0 0.2rem", fontWeight: 700 }}>Contas</p>
                                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                                            <CircleCheck style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                                            <span>
                                                {testResult.accounts.rowCount} linhas · {testResult.accounts.accountCount} contas ({testResult.accounts.accountNames.join(", ") || "nenhuma"}) · {testResult.accounts.dateFrom || "—"} a {testResult.accounts.dateTo || "—"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0 0 0.2rem", fontWeight: 700 }}>Campanhas</p>
                                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                                            {testResult.campaigns.rowCount > 0 ? <CircleCheck style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} /> : <CircleAlert style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1, color: "#fbbf24" }} />}
                                            <span>
                                                {testResult.campaigns.rowCount > 0
                                                    ? `${testResult.campaigns.rowCount} linhas · ${testResult.campaigns.accountCount} contas · ${testResult.campaigns.dateFrom} a ${testResult.campaigns.dateTo}`
                                                    : "Sem dados (drill-down não vai funcionar até configurar a planilha de campanhas)"}
                                            </span>
                                        </div>
                                    </div>
                                    {[...testResult.accounts.perSheet, ...testResult.campaigns.perSheet].some(s => s.error) && (
                                        <div style={{ paddingTop: "0.4rem", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                            {[...testResult.accounts.perSheet, ...testResult.campaigns.perSheet].filter(s => s.error).map((s, i) => (
                                                <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", color: "#f87171" }}>
                                                    <CircleAlert style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                                                    <span style={{ wordBreak: "break-all" }}>{s.url.slice(0, 60)}... — {s.error}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                                    <CircleAlert style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                                    <span>{testResult.error}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    {isConfigured ? (
                        <button onClick={handleClear} className="g-btn-secondary" style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)", padding: "0.5rem 0.75rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <Trash2 style={{ width: 13, height: 13 }} /> Limpar
                        </button>
                    ) : <div />}

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={onClose} className="g-btn-secondary" style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem" }}>
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="g-btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                            {saved ? <Check style={{ width: 14, height: 14 }} /> : <Globe style={{ width: 14, height: 14 }} />}
                            {saved ? "Salvo!" : "Salvar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
