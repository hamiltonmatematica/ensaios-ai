"use client";
import { useState, useEffect } from "react";
import { Globe, Check, X, Trash2, PlugZap, Loader2, CircleCheck, CircleAlert } from "lucide-react";

export interface GoogleAdsConfig {
    sheetCsvUrl: string;
}

export const EMPTY_GOOGLE_ADS_CONFIG: GoogleAdsConfig = { sheetCsvUrl: "" };

interface Props {
    open: boolean;
    onClose: () => void;
    currentConfig: GoogleAdsConfig;
    onSave: (config: GoogleAdsConfig) => void;
    onClear: () => void;
}

type TestResult =
    | { ok: true; rowCount: number; accountCount: number; accountNames: string[]; dateFrom: string; dateTo: string }
    | { ok: false; error: string };

export default function GoogleAdsTokenModal({ open, onClose, currentConfig, onSave, onClear }: Props) {
    const [config, setConfig] = useState<GoogleAdsConfig>(currentConfig);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    useEffect(() => {
        setConfig(currentConfig);
        setTestResult(null);
    }, [currentConfig, open]);

    if (!open) return null;

    const isConfigured = !!currentConfig.sheetCsvUrl;

    const handleSave = () => {
        onSave(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClear = () => {
        setConfig(EMPTY_GOOGLE_ADS_CONFIG);
        setTestResult(null);
        onClear();
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const headers: Record<string, string> = {};
            if (config.sheetCsvUrl) headers["x-google-ads-sheet-url"] = config.sheetCsvUrl;

            const res = await fetch("/api/meugestor/gads/test", { headers });
            const json = await res.json();
            if (json.success) {
                setTestResult({ ok: true, ...json.data });
            } else {
                setTestResult({ ok: false, error: json.error || "Falha desconhecida" });
            }
        } catch (e: any) {
            setTestResult({ ok: false, error: e.message || "Falha de rede ao testar a planilha" });
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
                width: "min(560px, 95%)", maxHeight: "90vh", overflowY: "auto", background: "rgba(15,18,37,0.98)", borderRadius: "1rem",
                border: "1px solid var(--glass-border)", padding: "1.5rem", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "0.5rem", background: "rgba(76,110,245,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Globe style={{ width: 16, height: 16, color: "#748ffc" }} />
                        </div>
                        <div>
                            <h3 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>Configuração Google Ads</h3>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", margin: 0 }}>Via planilha exportada — sem OAuth, sem Google Cloud</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.35rem", fontWeight: 600 }}>
                        URL do CSV publicado da planilha
                    </label>
                    <input
                        type="text"
                        value={config.sheetCsvUrl}
                        onChange={e => setConfig({ sheetCsvUrl: e.target.value })}
                        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                        style={{
                            width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: "0.5rem", padding: "0.6rem 0.75rem", color: "white", fontSize: "0.8rem",
                            fontFamily: "monospace", outline: "none", boxSizing: "border-box",
                        }}
                    />
                    <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>
                        Essa URL fica salva no localStorage do seu navegador e é usada pra baixar as métricas a cada consulta.
                    </p>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "1.25rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "white" }}>Como conseguir essa URL?</p>
                    <p style={{ margin: "0.3rem 0 0" }}>Passo a passo completo em GOOGLE_ADS_SETUP.md — um Google Ads Script (scripts/google-ads-export.gs) exporta os dados pra uma Google Sheets, que você publica na web como CSV.</p>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                    <button
                        onClick={handleTest}
                        disabled={testing || !config.sheetCsvUrl}
                        className="g-btn-secondary"
                        style={{ width: "100%", justifyContent: "center", padding: "0.6rem", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", opacity: (testing || !config.sheetCsvUrl) ? 0.5 : 1 }}
                    >
                        {testing ? <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} /> : <PlugZap style={{ width: 14, height: 14 }} />}
                        {testing ? "Testando..." : "Testar planilha"}
                    </button>

                    {testResult && (
                        <div style={{
                            marginTop: "0.6rem", borderRadius: "0.5rem", padding: "0.65rem 0.75rem", fontSize: "0.72rem",
                            background: testResult.ok ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                            border: `1px solid ${testResult.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                            color: testResult.ok ? "#34d399" : "#f87171",
                        }}>
                            {testResult.ok ? (
                                <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                                    <CircleCheck style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                                    <span>
                                        Lida! {testResult.rowCount} linhas · {testResult.accountCount} contas ({testResult.accountNames.join(", ")}) · {testResult.dateFrom} a {testResult.dateTo}
                                    </span>
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
