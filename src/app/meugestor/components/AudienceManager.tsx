"use client";
import { Fragment, useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    Users, X, RefreshCw, Plus, Loader2, AlertCircle, Copy as CopyIcon,
    UserPlus, ArrowLeft, Upload, CheckCircle2, ExternalLink, ShieldAlert,
} from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    accountId: string;
    apiHeaders: Record<string, string>;
}

interface Audience {
    id: string;
    name: string;
    subtype?: string;
    description?: string;
    approximate_count_lower_bound?: number;
    time_updated?: number | string;
}

const SUBTYPE_BADGE: Record<string, { label: string; cls: string }> = {
    CUSTOM: { label: "Lista", cls: "g-badge-info" },
    LOOKALIKE: { label: "Semelhante", cls: "g-badge-purple" },
    WEBSITE: { label: "Site", cls: "g-badge-success" },
    ENGAGEMENT: { label: "Engajamento", cls: "g-badge-warning" },
};

const COUNTRIES = [
    { value: "BR", label: "BR — Brasil" },
    { value: "PT", label: "PT — Portugal" },
    { value: "US", label: "US — EUA" },
];

const compactFmt = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function formatSize(n?: number): string {
    if (!n || n < 1000) return "—";
    return compactFmt.format(n);
}

function formatUpdated(t?: number | string): string {
    if (!t) return "—";
    let d: Date;
    if (typeof t === "number" || /^\d+$/.test(String(t))) {
        d = new Date(Number(t) * 1000);
    } else {
        d = new Date(t);
    }
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
}

const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "0.5rem", padding: "0.55rem 0.7rem", color: "white", fontSize: "0.8rem", outline: "none",
};

const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.72rem", color: "rgba(255,255,255,0.7)",
    marginBottom: "0.3rem", fontWeight: 600,
};

export default function AudienceManager({ open, onClose, accountId, apiHeaders }: Props) {
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [tosUrl, setTosUrl] = useState("");
    const [notice, setNotice] = useState("");

    // Formulário "Novo público de lista"
    const [newListOpen, setNewListOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [creatingList, setCreatingList] = useState(false);

    // Mini-form de lookalike inline (por linha)
    const [lookalikeFor, setLookalikeFor] = useState<string | null>(null);
    const [lalCountry, setLalCountry] = useState("BR");
    const [lalRatio, setLalRatio] = useState(1);
    const [lalSubmitting, setLalSubmitting] = useState(false);
    const [lalError, setLalError] = useState("");

    // Painel de upload de pessoas
    const [uploadFor, setUploadFor] = useState<{ id: string; name: string } | null>(null);
    const [rawText, setRawText] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [sendResult, setSendResult] = useState<{ received: number; invalid: number } | null>(null);

    const loadAbortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        loadAbortRef.current?.abort();
        const controller = new AbortController();
        loadAbortRef.current = controller;
        setLoading(true); setError(""); setTosUrl("");
        try {
            const res = await fetch(`/api/meugestor/manage/audiences?accountId=${encodeURIComponent(accountId)}`, {
                headers: apiHeaders,
                signal: controller.signal,
            });
            const json = await res.json();
            if (controller.signal.aborted) return;
            if (!json.success) {
                if (json.tosUrl) setTosUrl(json.tosUrl);
                throw new Error(json.error || "Falha ao carregar públicos");
            }
            setAudiences(Array.isArray(json.data) ? json.data : []);
        } catch (e: any) {
            if (controller.signal.aborted || e?.name === "AbortError") return;
            setError(e.message || "Erro ao carregar públicos");
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [accountId, apiHeaders]);

    useEffect(() => {
        if (open) {
            setNotice(""); setUploadFor(null); setLookalikeFor(null); setNewListOpen(false);
            load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, accountId]);

    const parsed = useMemo(() => {
        const emails: string[] = [];
        const phones: string[] = [];
        let ignored = 0;
        rawText.split(/[\n,;]+/).forEach(tok => {
            const t = tok.trim();
            if (!t) return;
            if (t.includes("@")) {
                emails.push(t.toLowerCase());
            } else {
                const digits = t.replace(/\D/g, "");
                if (digits.length >= 8) phones.push(digits);
                else ignored++;
            }
        });
        return { emails, phones, ignored };
    }, [rawText]);

    if (!open) return null;

    const openUpload = (id: string, name: string) => {
        setUploadFor({ id, name });
        setRawText(""); setSendError(""); setSendResult(null); setTosUrl("");
    };

    const handleCreateList = async () => {
        if (!newName.trim()) return;
        setCreatingList(true); setError(""); setTosUrl("");
        try {
            const res = await fetch("/api/meugestor/manage/audiences", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...apiHeaders },
                body: JSON.stringify({ accountId, kind: "list", name: newName.trim(), description: newDesc.trim() || undefined }),
            });
            const json = await res.json();
            if (!json.success) {
                if (json.tosUrl) setTosUrl(json.tosUrl);
                throw new Error(json.error || "Falha ao criar público");
            }
            setNewListOpen(false);
            const createdName = newName.trim();
            setNewName(""); setNewDesc("");
            await load();
            if (json.data?.id) openUpload(json.data.id, createdName);
        } catch (e: any) {
            setError(e.message || "Erro ao criar público");
        } finally {
            setCreatingList(false);
        }
    };

    const handleCreateLookalike = async (origin: Audience) => {
        setLalSubmitting(true); setLalError(""); setTosUrl("");
        try {
            const res = await fetch("/api/meugestor/manage/audiences", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...apiHeaders },
                body: JSON.stringify({
                    accountId,
                    kind: "lookalike",
                    name: `${origin.name} · Semelhante ${lalRatio}% ${lalCountry}`,
                    originAudienceId: origin.id,
                    country: lalCountry,
                    ratio: lalRatio / 100,
                }),
            });
            const json = await res.json();
            if (!json.success) {
                if (json.tosUrl) setTosUrl(json.tosUrl);
                throw new Error(json.error || "Falha ao criar público semelhante");
            }
            setLookalikeFor(null);
            setNotice("Público semelhante criado. A Meta pode levar algumas horas para preenchê-lo.");
            await load();
        } catch (e: any) {
            setLalError(e.message || "Erro ao criar semelhante");
        } finally {
            setLalSubmitting(false);
        }
    };

    const handleSendUsers = async () => {
        if (!uploadFor) return;
        if (parsed.emails.length === 0 && parsed.phones.length === 0) return;
        setSending(true); setSendError(""); setSendResult(null); setTosUrl("");
        try {
            const res = await fetch(`/api/meugestor/manage/audiences/${uploadFor.id}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...apiHeaders },
                body: JSON.stringify({ emails: parsed.emails, phones: parsed.phones }),
            });
            const json = await res.json();
            if (!json.success) {
                if (json.tosUrl) setTosUrl(json.tosUrl);
                throw new Error(json.error || "Falha ao enviar a lista");
            }
            setSendResult({ received: json.data?.received ?? 0, invalid: json.data?.invalid ?? 0 });
        } catch (e: any) {
            setSendError(e.message || "Erro ao enviar a lista");
        } finally {
            setSending(false);
        }
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            setRawText(prev => (prev ? prev + "\n" + text : text));
        } catch {
            setSendError("Não foi possível ler o arquivo.");
        }
        e.target.value = "";
    };

    const tosCard = tosUrl && (
        <div style={{
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: "0.6rem", padding: "0.85rem", marginBottom: "1rem",
            display: "flex", gap: "0.6rem", alignItems: "flex-start",
        }}>
            <ShieldAlert style={{ width: 18, height: 18, color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: "#fbbf24", fontWeight: 700, fontSize: "0.8rem" }}>
                    Termos de Públicos Personalizados pendentes
                </p>
                <p style={{ margin: "0.25rem 0 0.55rem", color: "rgba(255,255,255,0.75)", fontSize: "0.73rem" }}>
                    A conta precisa aceitar os Termos de Públicos Personalizados da Meta antes de criar ou alimentar públicos.
                </p>
                <a href={tosUrl} target="_blank" rel="noreferrer" className="g-btn-secondary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.75rem", fontSize: "0.72rem", color: "#fbbf24", borderColor: "rgba(245,158,11,0.4)", textDecoration: "none" }}>
                    Aceitar Termos de Públicos <ExternalLink style={{ width: 12, height: 12 }} />
                </a>
            </div>
        </div>
    );

    return (
        <div onClick={onClose} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
            <div onClick={e => e.stopPropagation()} className="g-glass" style={{
                width: "min(860px, 96%)", maxHeight: "88vh", overflowY: "auto",
                background: "rgba(15,18,37,0.98)", borderRadius: "1rem",
                border: "1px solid var(--glass-border)", padding: "1.5rem", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}>
                {/* Cabeçalho */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "0.5rem", background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Users style={{ width: 16, height: 16, color: "#a78bfa" }} />
                        </div>
                        <div>
                            <h3 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>Públicos da conta</h3>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", margin: 0 }}>
                                Listas, públicos semelhantes e públicos de engajamento
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {tosCard}

                {uploadFor ? (
                    /* ============ PAINEL DE UPLOAD ============ */
                    <div>
                        <button onClick={() => setUploadFor(null)} className="g-btn-secondary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.7rem", fontSize: "0.72rem", marginBottom: "0.85rem" }}>
                            <ArrowLeft style={{ width: 13, height: 13 }} /> Voltar aos públicos
                        </button>

                        <h4 style={{ color: "white", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <UserPlus style={{ width: 15, height: 15, color: "#60a5fa" }} />
                            Adicionar pessoas — {uploadFor.name}
                        </h4>
                        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", margin: "0 0 0.85rem" }}>
                            Cole os contatos abaixo ou importe um arquivo .csv/.txt.
                        </p>

                        <textarea
                            value={rawText}
                            onChange={e => { setRawText(e.target.value); setSendResult(null); }}
                            placeholder={"Cole e-mails e/ou telefones (um por linha, vírgula ou ;)"}
                            rows={8}
                            style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical", marginBottom: "0.6rem" }}
                        />

                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                            <label className="g-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.75rem", fontSize: "0.72rem", cursor: "pointer" }}>
                                <Upload style={{ width: 13, height: 13 }} /> Importar arquivo (.csv/.txt)
                                <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
                            </label>
                            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>
                                <strong style={{ color: "#60a5fa" }}>{parsed.emails.length}</strong> e-mails,{" "}
                                <strong style={{ color: "#34d399" }}>{parsed.phones.length}</strong> telefones,{" "}
                                <strong style={{ color: "rgba(255,255,255,0.45)" }}>{parsed.ignored}</strong> ignorados
                            </span>
                        </div>

                        {sendError && (
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "0.85rem" }}>
                                <AlertCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                                <p style={{ margin: 0, color: "#f87171", fontSize: "0.73rem" }}>{sendError}</p>
                            </div>
                        )}

                        {sendResult ? (
                            <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "0.85rem" }}>
                                <p style={{ margin: 0, color: "#34d399", fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <CheckCircle2 style={{ width: 15, height: 15 }} />
                                    Recebidos: {sendResult.received} · Inválidos: {sendResult.invalid}
                                </p>
                                <p style={{ margin: "0.3rem 0 0", color: "rgba(255,255,255,0.6)", fontSize: "0.7rem" }}>
                                    A Meta faz a correspondência em até 1h. Hash SHA-256 aplicado no servidor — os dados não são armazenados.
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={handleSendUsers}
                                disabled={sending || (parsed.emails.length === 0 && parsed.phones.length === 0)}
                                className="g-btn-primary"
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "0.4rem",
                                    padding: "0.55rem 1.1rem", fontSize: "0.78rem",
                                    opacity: sending || (parsed.emails.length === 0 && parsed.phones.length === 0) ? 0.6 : 1,
                                    cursor: sending ? "wait" : "pointer",
                                }}>
                                {sending ? <Loader2 className="g-pulse" style={{ width: 14, height: 14 }} /> : <Upload style={{ width: 14, height: 14 }} />}
                                {sending ? "Enviando..." : "Enviar"}
                            </button>
                        )}
                    </div>
                ) : (
                    /* ============ LISTA DE PÚBLICOS ============ */
                    <div>
                        {/* Toolbar */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
                            <button onClick={() => setNewListOpen(v => !v)} className="g-btn-primary"
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.85rem", fontSize: "0.74rem" }}>
                                <Plus style={{ width: 13, height: 13 }} /> Novo público de lista
                            </button>
                            <button onClick={load} disabled={loading} className="g-btn-secondary" title="Atualizar"
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.75rem", fontSize: "0.74rem" }}>
                                <RefreshCw className={loading ? "g-pulse" : undefined} style={{ width: 13, height: 13 }} /> Atualizar
                            </button>
                        </div>

                        {newListOpen && (
                            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.6rem", padding: "0.85rem", marginBottom: "0.85rem" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.65rem" }}>
                                    <div>
                                        <label style={labelStyle}>Nome do público *</label>
                                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex.: Clientes 2026" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Descrição</label>
                                        <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Opcional" style={inputStyle} />
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button onClick={handleCreateList} disabled={creatingList || !newName.trim()} className="g-btn-primary"
                                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.85rem", fontSize: "0.73rem", opacity: creatingList || !newName.trim() ? 0.6 : 1 }}>
                                        {creatingList ? <Loader2 className="g-pulse" style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
                                        {creatingList ? "Criando..." : "Criar e adicionar pessoas"}
                                    </button>
                                    <button onClick={() => setNewListOpen(false)} className="g-btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.73rem" }}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {notice && (
                            <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "0.5rem", padding: "0.55rem 0.75rem", marginBottom: "0.85rem", color: "#34d399", fontSize: "0.73rem" }}>
                                {notice}
                            </div>
                        )}

                        {error && (
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "0.85rem" }}>
                                <AlertCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                                <p style={{ margin: 0, color: "#f87171", fontSize: "0.73rem" }}>{error}</p>
                            </div>
                        )}

                        {loading ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", padding: "1.5rem 0", justifyContent: "center" }}>
                                <Loader2 className="g-pulse" style={{ width: 16, height: 16 }} /> Carregando públicos...
                            </div>
                        ) : audiences.length === 0 && !error ? (
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", textAlign: "center", padding: "1.5rem 0" }}>
                                Nenhum público nesta conta ainda. Crie um público de lista para começar.
                            </p>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                            {["Nome", "Tipo", "Tamanho", "Atualizado", "Ações"].map(h => (
                                                <th key={h} style={{ textAlign: h === "Tamanho" ? "right" : "left", padding: "0.5rem 0.6rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {audiences.map(aud => {
                                            const badge = SUBTYPE_BADGE[aud.subtype || ""] || { label: aud.subtype || "—", cls: "" };
                                            return (
                                                <Fragment key={aud.id}>
                                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                                        <td style={{ padding: "0.55rem 0.6rem", color: "rgba(255,255,255,0.9)", fontWeight: 600, maxWidth: 260 }}>
                                                            <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={aud.name}>{aud.name}</span>
                                                        </td>
                                                        <td style={{ padding: "0.55rem 0.6rem" }}>
                                                            <span className={`g-badge ${badge.cls}`} style={{ fontSize: "0.65rem" }}>{badge.label}</span>
                                                        </td>
                                                        <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums" }}>
                                                            {formatSize(aud.approximate_count_lower_bound)}
                                                        </td>
                                                        <td style={{ padding: "0.55rem 0.6rem", color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
                                                            {formatUpdated(aud.time_updated)}
                                                        </td>
                                                        <td style={{ padding: "0.55rem 0.6rem", whiteSpace: "nowrap" }}>
                                                            <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setLalError("");
                                                                        setLookalikeFor(lookalikeFor === aud.id ? null : aud.id);
                                                                    }}
                                                                    className="g-btn-secondary"
                                                                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.35rem 0.6rem", fontSize: "0.68rem", color: "#a78bfa", borderColor: "rgba(139,92,246,0.3)" }}>
                                                                    <CopyIcon style={{ width: 11, height: 11 }} /> Criar Semelhante
                                                                </button>
                                                                {aud.subtype === "CUSTOM" && (
                                                                    <button
                                                                        onClick={() => openUpload(aud.id, aud.name)}
                                                                        className="g-btn-secondary"
                                                                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.35rem 0.6rem", fontSize: "0.68rem", color: "#60a5fa", borderColor: "rgba(59,130,246,0.3)" }}>
                                                                        <UserPlus style={{ width: 11, height: 11 }} /> Adicionar pessoas
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {lookalikeFor === aud.id && (
                                                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(139,92,246,0.06)" }}>
                                                            <td colSpan={5} style={{ padding: "0.65rem 0.75rem" }}>
                                                                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
                                                                    <div>
                                                                        <label style={labelStyle}>País</label>
                                                                        <select value={lalCountry} onChange={e => setLalCountry(e.target.value)} style={{ ...inputStyle, width: 160 }}>
                                                                            {COUNTRIES.map(c => <option key={c.value} value={c.value} style={{ background: "#0f1225" }}>{c.label}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label style={labelStyle}>Tamanho (semelhança)</label>
                                                                        <select value={lalRatio} onChange={e => setLalRatio(Number(e.target.value))} style={{ ...inputStyle, width: 120 }}>
                                                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(r => (
                                                                                <option key={r} value={r} style={{ background: "#0f1225" }}>{r}%</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <button onClick={() => handleCreateLookalike(aud)} disabled={lalSubmitting} className="g-btn-primary"
                                                                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.85rem", fontSize: "0.72rem", opacity: lalSubmitting ? 0.6 : 1 }}>
                                                                        {lalSubmitting ? <Loader2 className="g-pulse" style={{ width: 13, height: 13 }} /> : <CopyIcon style={{ width: 13, height: 13 }} />}
                                                                        {lalSubmitting ? "Criando..." : "Criar"}
                                                                    </button>
                                                                    <button onClick={() => setLookalikeFor(null)} className="g-btn-secondary" style={{ padding: "0.5rem 0.85rem", fontSize: "0.72rem" }}>
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                                {lalError && (
                                                                    <p style={{ margin: "0.5rem 0 0", color: "#f87171", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                                        <AlertCircle style={{ width: 12, height: 12 }} /> {lalError}
                                                                    </p>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
