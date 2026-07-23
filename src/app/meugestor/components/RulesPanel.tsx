"use client";
import { useState, useEffect, useCallback } from "react";
import { Zap, X, RefreshCw, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    accountId: string;
    apiHeaders: Record<string, string>;
}

interface Rule {
    id: string;
    name: string;
    status?: string;
    entity_type?: string;
    evaluation_spec?: any;
    execution_spec?: any;
}

type Template = "pause_high_spend" | "pause_no_results" | "pause_high_cpa";
type EntityType = "AD" | "ADSET" | "CAMPAIGN";

const TEMPLATES: { value: Template; label: string }[] = [
    { value: "pause_high_spend", label: "Pausar se gastar mais de X sem avaliar resultado" },
    { value: "pause_no_results", label: "Pausar se gastar X e não ter resultado" },
    { value: "pause_high_cpa", label: "Pausar se custo por resultado passar de X" },
];

const WINDOWS = [
    { value: 1, label: "Hoje" },
    { value: 3, label: "Últimos 3 dias" },
    { value: 7, label: "Últimos 7 dias" },
];

const LEVELS: { value: EntityType; label: string }[] = [
    { value: "AD", label: "Anúncios" },
    { value: "ADSET", label: "Conjuntos" },
    { value: "CAMPAIGN", label: "Campanhas" },
];

const VALUE_LABEL: Record<Template, string> = {
    pause_high_spend: "Gasto máximo (R$)",
    pause_no_results: "Gasto sem resultado (R$)",
    pause_high_cpa: "Custo por resultado máximo (R$)",
};

function getRuleEntityType(rule: Rule): string | undefined {
    if (rule.entity_type) return rule.entity_type;
    const filters = rule.evaluation_spec?.filters;
    if (!Array.isArray(filters)) return undefined;
    const f = filters.find((x: any) => x?.field === "entity_type");
    const v = Array.isArray(f?.value) ? f.value[0] : f?.value;
    return typeof v === "string" ? v : undefined;
}

function statusBadge(status?: string): { label: string; cls: string } {
    switch ((status || "").toUpperCase()) {
        case "ENABLED": return { label: "Ativa", cls: "g-badge-success" };
        case "DISABLED": return { label: "Pausada", cls: "g-badge-warning" };
        case "DELETED": return { label: "Excluída", cls: "g-badge-danger" };
        case "HAS_ISSUES": return { label: "Com problemas", cls: "g-badge-danger" };
        default: return { label: status || "—", cls: "" };
    }
}

const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "0.5rem", padding: "0.55rem 0.7rem", color: "white", fontSize: "0.8rem", outline: "none",
};

const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.72rem", color: "rgba(255,255,255,0.7)",
    marginBottom: "0.3rem", fontWeight: 600,
};

export default function RulesPanel({ open, onClose, accountId, apiHeaders }: Props) {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Formulário de criação
    const [name, setName] = useState("");
    const [template, setTemplate] = useState<Template>("pause_high_spend");
    const [valueReais, setValueReais] = useState("");
    const [days, setDays] = useState(3);
    const [entityType, setEntityType] = useState<EntityType>("ADSET");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [created, setCreated] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setListError("");
        try {
            const res = await fetch(`/api/meugestor/manage/rules?accountId=${encodeURIComponent(accountId)}`, {
                headers: apiHeaders,
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Falha ao carregar regras");
            setRules(Array.isArray(json.data) ? json.data : []);
        } catch (e: any) {
            setListError(e.message || "Erro ao carregar regras");
        } finally {
            setLoading(false);
        }
    }, [accountId, apiHeaders]);

    useEffect(() => {
        if (open) {
            setFormError(""); setCreated(false);
            load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, accountId]);

    if (!open) return null;

    const parsed = parseFloat(valueReais.replace(",", "."));
    const formValid = name.trim().length > 0 && !isNaN(parsed) && parsed > 0;

    const handleCreate = async () => {
        if (!formValid || submitting) return;
        setSubmitting(true); setFormError(""); setCreated(false);
        try {
            const cents = Math.round(parsed * 100);
            const params: { spendCents?: number; cpaCents?: number; days?: number } = { days };
            if (template === "pause_high_cpa") params.cpaCents = cents;
            else params.spendCents = cents;

            const res = await fetch("/api/meugestor/manage/rules", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...apiHeaders },
                body: JSON.stringify({
                    accountId,
                    rule: { name: name.trim(), template, params, entityType },
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Falha ao criar a regra");
            setName(""); setValueReais("");
            setCreated(true);
            setTimeout(() => setCreated(false), 3000);
            await load();
        } catch (e: any) {
            setFormError(e.message || "Erro ao criar a regra");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (rule: Rule) => {
        if (!confirm(`Excluir a regra "${rule.name}"? Esta ação não pode ser desfeita.`)) return;
        setDeletingId(rule.id); setListError("");
        try {
            const res = await fetch(`/api/meugestor/manage/rules?ruleId=${encodeURIComponent(rule.id)}`, {
                method: "DELETE",
                headers: apiHeaders,
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Falha ao excluir a regra");
            await load();
        } catch (e: any) {
            setListError(e.message || "Erro ao excluir a regra");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div onClick={onClose} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
            <div onClick={e => e.stopPropagation()} className="g-glass" style={{
                width: "min(760px, 96%)", maxHeight: "88vh", overflowY: "auto",
                background: "rgba(15,18,37,0.98)", borderRadius: "1rem",
                border: "1px solid var(--glass-border)", padding: "1.5rem", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}>
                {/* Cabeçalho */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "0.5rem", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Zap style={{ width: 16, height: 16, color: "#fbbf24" }} />
                        </div>
                        <div>
                            <h3 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                                Regras automáticas <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: "0.75rem" }}>(beta)</span>
                            </h3>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", margin: 0 }}>
                                A Meta avalia as regras a cada ~30 minutos e pausa o que estourar os limites
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Formulário de criação */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.6rem", padding: "0.9rem", marginBottom: "1.1rem" }}>
                    <p style={{ margin: "0 0 0.65rem", color: "white", fontWeight: 700, fontSize: "0.8rem" }}>Nova regra</p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.65rem" }}>
                        <div>
                            <label style={labelStyle}>Nome *</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Pausar CPA alto" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Modelo</label>
                            <select value={template} onChange={e => setTemplate(e.target.value as Template)} style={inputStyle}>
                                {TEMPLATES.map(t => <option key={t.value} value={t.value} style={{ background: "#0f1225" }}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div>
                            <label style={labelStyle}>{VALUE_LABEL[template]} *</label>
                            <input
                                type="number" step={0.01} min={0}
                                value={valueReais}
                                onChange={e => setValueReais(e.target.value)}
                                placeholder="Ex.: 50,00"
                                style={{ ...inputStyle, fontVariantNumeric: "tabular-nums" }}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Janela</label>
                            <select value={days} onChange={e => setDays(Number(e.target.value))} style={inputStyle}>
                                {WINDOWS.map(w => <option key={w.value} value={w.value} style={{ background: "#0f1225" }}>{w.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Nível</label>
                            <select value={entityType} onChange={e => setEntityType(e.target.value as EntityType)} style={inputStyle}>
                                {LEVELS.map(l => <option key={l.value} value={l.value} style={{ background: "#0f1225" }}>{l.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {formError && (
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", padding: "0.55rem 0.7rem", marginBottom: "0.75rem" }}>
                            <AlertCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, color: "#f87171", fontSize: "0.72rem" }}>{formError}</p>
                        </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <button
                            onClick={handleCreate}
                            disabled={!formValid || submitting}
                            className="g-btn-primary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.95rem", fontSize: "0.75rem", opacity: !formValid || submitting ? 0.6 : 1, cursor: submitting ? "wait" : "pointer" }}>
                            {submitting ? <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} /> : <Plus style={{ width: 14, height: 14 }} />}
                            {submitting ? "Criando..." : "Criar regra"}
                        </button>
                        {created && <span style={{ color: "#34d399", fontSize: "0.73rem", fontWeight: 600 }}>Regra criada!</span>}
                    </div>
                </div>

                {/* Lista de regras */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                    <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: "0.8rem" }}>Regras existentes</p>
                    <button onClick={load} disabled={loading} className="g-btn-secondary" title="Atualizar"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.7rem", fontSize: "0.72rem" }}>
                        <RefreshCw className={loading ? "g-pulse" : undefined} style={{ width: 12, height: 12 }} /> Atualizar
                    </button>
                </div>

                {listError && (
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", padding: "0.55rem 0.7rem", marginBottom: "0.75rem" }}>
                        <AlertCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ margin: 0, color: "#f87171", fontSize: "0.72rem" }}>{listError}</p>
                    </div>
                )}

                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", padding: "1.25rem 0", justifyContent: "center" }}>
                        <Loader2 className="g-pulse" style={{ width: 16, height: 16 }} /> Carregando regras...
                    </div>
                ) : rules.length === 0 && !listError ? (
                    <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", textAlign: "center", padding: "1.25rem 0" }}>
                        Nenhuma regra nesta conta ainda. Crie a primeira acima.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {rules.map(rule => {
                            const badge = statusBadge(rule.status);
                            const entityLevel = getRuleEntityType(rule);
                            return (
                                <div key={rule.id} style={{
                                    display: "flex", alignItems: "center", gap: "0.6rem",
                                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                                    borderRadius: "0.5rem", padding: "0.6rem 0.75rem",
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontWeight: 600, fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={rule.name}>
                                            {rule.name}
                                        </p>
                                        {entityLevel && (
                                            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.65rem" }}>
                                                Nível: {LEVELS.find(l => l.value === entityLevel)?.label || entityLevel}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`g-badge ${badge.cls}`} style={{ fontSize: "0.63rem", flexShrink: 0 }}>{badge.label}</span>
                                    <button
                                        onClick={() => handleDelete(rule)}
                                        disabled={deletingId === rule.id}
                                        title="Excluir regra"
                                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "0.25rem", flexShrink: 0, opacity: deletingId === rule.id ? 0.5 : 1 }}>
                                        {deletingId === rule.id
                                            ? <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} />
                                            : <Trash2 style={{ width: 14, height: 14 }} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
