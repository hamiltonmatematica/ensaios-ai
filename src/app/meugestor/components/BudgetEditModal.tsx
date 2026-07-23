"use client";
import { useState, useEffect } from "react";
import { Wallet, X, Loader2, AlertCircle, AlertTriangle, Check } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    entity: {
        id: string;
        name: string;
        kind: "campaign" | "adset";
        currentDailyCents?: number | null;
    } | null;
    apiHeaders: Record<string, string>;
    onSaved: () => void;
}

const KIND_BADGE: Record<string, { label: string; cls: string }> = {
    campaign: { label: "Campanha", cls: "g-badge-info" },
    adset: { label: "Conjunto", cls: "g-badge-purple" },
};

const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Aceita "10,50", "10.50" e "1.050,00" (vírgula decimal pt-BR; pontos como milhar quando há vírgula).
const parseReais = (s: string): number => {
    const t = s.trim();
    if (!t) return NaN;
    let normalized: string;
    if (t.includes(",")) {
        normalized = t.replace(/\./g, "").replace(",", ".");
    } else if ((t.match(/\./g) || []).length > 1) {
        normalized = t.replace(/\./g, "");
    } else {
        normalized = t;
    }
    if (!/^\d+(\.\d*)?$/.test(normalized)) return NaN;
    return parseFloat(normalized);
};

export default function BudgetEditModal({ open, onClose, entity, apiHeaders, onSaved }: Props) {
    const [value, setValue] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open && entity) {
            setValue(entity.currentDailyCents ? (entity.currentDailyCents / 100).toFixed(2).replace(".", ",") : "");
            setError("");
        }
    }, [open, entity]);

    if (!open || !entity) return null;

    const badge = KIND_BADGE[entity.kind];
    const parsed = parseReais(value);
    const valid = !isNaN(parsed) && parsed > 0;
    const bigRaise = valid && !!entity.currentDailyCents && entity.currentDailyCents > 0
        && Math.round(parsed * 100) > entity.currentDailyCents * 4;

    const handleSave = async () => {
        if (!valid || saving) return;
        setSaving(true); setError("");
        try {
            const res = await fetch("/api/meugestor/manage/update", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...apiHeaders },
                body: JSON.stringify({
                    id: entity.id,
                    fields: { dailyBudgetCents: Math.round(parsed * 100) },
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Falha ao atualizar o orçamento");
            onSaved();
            onClose();
        } catch (e: any) {
            setError(e.message || "Erro ao atualizar o orçamento");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={onClose} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
            <div onClick={e => e.stopPropagation()} className="g-glass" style={{
                width: "min(420px, 94%)", background: "rgba(15,18,37,0.98)", borderRadius: "1rem",
                border: "1px solid var(--glass-border)", padding: "1.5rem", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}>
                {/* Cabeçalho */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "0.5rem", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Wallet style={{ width: 16, height: 16, color: "#34d399" }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ color: "white", fontSize: "0.9rem", fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={entity.name}>
                                {entity.name}
                            </h3>
                            <span className={`g-badge ${badge.cls}`} style={{ fontSize: "0.62rem", marginTop: "0.2rem" }}>{badge.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", flexShrink: 0 }}>
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Campo de orçamento */}
                <div style={{ marginBottom: "0.85rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem", fontWeight: 600 }}>
                        Orçamento diário (R$)
                    </label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={e => setValue(e.target.value.replace(/[^\d.,]/g, ""))}
                        placeholder="Ex.: 50,00"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                        style={{
                            width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: "0.5rem", padding: "0.65rem 0.75rem", color: "white", fontSize: "0.95rem",
                            fontVariantNumeric: "tabular-nums", outline: "none",
                        }}
                    />
                    {entity.currentDailyCents ? (
                        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginTop: "0.35rem" }}>
                            Atual: {currencyFmt.format(entity.currentDailyCents / 100)}/dia
                        </p>
                    ) : (
                        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginTop: "0.35rem" }}>
                            Sem orçamento diário atual — se o orçamento estiver em outro nível (ex.: CBO na campanha), a Meta recusará a alteração aqui.
                        </p>
                    )}
                </div>

                {bigRaise && (
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "0.5rem", padding: "0.55rem 0.7rem", marginBottom: "0.85rem" }}>
                        <AlertTriangle style={{ width: 14, height: 14, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ margin: 0, color: "#fbbf24", fontSize: "0.72rem" }}>
                            Aumento brusco pode reiniciar o aprendizado.
                        </p>
                    </div>
                )}

                {error && (
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", padding: "0.55rem 0.7rem", marginBottom: "0.85rem" }}>
                        <AlertCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ margin: 0, color: "#f87171", fontSize: "0.72rem" }}>{error}</p>
                    </div>
                )}

                {/* Ações */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button onClick={onClose} className="g-btn-secondary" style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem" }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!valid || saving}
                        className="g-btn-primary"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", opacity: !valid || saving ? 0.6 : 1, cursor: saving ? "wait" : "pointer" }}>
                        {saving ? <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} /> : <Check style={{ width: 14, height: 14 }} />}
                        {saving ? "Salvando..." : "Salvar orçamento"}
                    </button>
                </div>
            </div>
        </div>
    );
}
