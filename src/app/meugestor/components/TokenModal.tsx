"use client";
import { useState, useEffect } from "react";
import { Key, Check, ExternalLink, X, Trash2, AlertCircle } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    currentToken: string;
    onSave: (token: string) => void;
    onClear: () => void;
}

export default function TokenModal({ open, onClose, currentToken, onSave, onClear }: Props) {
    const [token, setToken] = useState(currentToken);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setToken(currentToken);
    }, [currentToken, open]);

    if (!open) return null;

    const handleSave = () => {
        onSave(token);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClear = () => {
        setToken("");
        onClear();
    };

    return (
        <div onClick={onClose} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
            <div onClick={e => e.stopPropagation()} className="g-glass" style={{
                width: "min(520px, 95%)", background: "rgba(15,18,37,0.98)", borderRadius: "1rem",
                border: "1px solid var(--glass-border)", padding: "1.5rem", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "0.5rem", background: "rgba(76,110,245,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Key style={{ width: 16, height: 16, color: "#748ffc" }} />
                        </div>
                        <div>
                            <h3 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>Configuração do Token Meta API</h3>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", margin: 0 }}>Altere seu token a qualquer momento sem depender de variáveis de servidor</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem", fontWeight: 600 }}>
                        Meta Access Token (EAAN... / EAAB...)
                    </label>
                    <textarea
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="Cole o novo META_ACCESS_TOKEN aqui..."
                        rows={4}
                        style={{
                            width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: "0.5rem", padding: "0.75rem", color: "white", fontSize: "0.8rem",
                            fontFamily: "monospace", resize: "vertical", outline: "none",
                        }}
                    />
                    <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>
                        Este token fica salvo no seu navegador e é enviado automaticamente nas consultas.
                    </p>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "1.25rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "white" }}>Precisa de um novo token?</p>
                    <a
                        href="https://developers.facebook.com/tools/explorer/"
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#748ffc", textDecoration: "none", marginTop: "0.25rem", fontWeight: 600 }}
                    >
                        Abrir Graph API Explorer da Meta <ExternalLink style={{ width: 12, height: 12 }} />
                    </a>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    {currentToken ? (
                        <button onClick={handleClear} className="g-btn-secondary" style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)", padding: "0.5rem 0.75rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <Trash2 style={{ width: 13, height: 13 }} /> Usar padrão (.env)
                        </button>
                    ) : <div />}

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={onClose} className="g-btn-secondary" style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem" }}>
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="g-btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                            {saved ? <Check style={{ width: 14, height: 14 }} /> : <Key style={{ width: 14, height: 14 }} />}
                            {saved ? "Salvo!" : "Salvar Token"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
