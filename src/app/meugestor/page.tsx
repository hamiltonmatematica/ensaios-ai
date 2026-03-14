"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart3, LayoutDashboard, Lightbulb, FileText, Users, DollarSign,
    MousePointerClick, ShoppingCart, Target, ChevronRight, ChevronLeft,
    RefreshCw, Search, Loader2, AlertCircle, TrendingUp, TrendingDown,
    AlertTriangle, Eye, ArrowLeft, Brain, Calendar, Menu, X, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid,
} from "recharts";

const PERIODS = [
    { value: "today", label: "Hoje" },
    { value: "yesterday", label: "Ontem" },
    { value: "last_3d", label: "3 dias" },
    { value: "last_7d", label: "7 dias" },
    { value: "last_14d", label: "14 dias" },
    { value: "last_30d", label: "30 dias" },
    { value: "this_month", label: "Este mês" },
    { value: "last_month", label: "Mês passado" },
];

// ========================================
// TYPES
// ========================================

interface AccountData {
    id: string;
    account_id: string;
    name: string;
    currency: string;
    account_status: number;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    reach: number;
    frequency: number;
    leads: number;
    purchases: number;
    messaging: number;
    total_spent_lifetime: number;
}

interface CampaignData {
    campaign_id: string;
    campaign_name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    reach: number;
    frequency: number;
    leads: number;
    purchases: number;
    messaging: number;
}

interface AdData {
    ad_id: string;
    ad_name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    reach: number;
    frequency: number;
    leads: number;
    purchases: number;
    messaging: number;
}

interface DailyData {
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    leads: number;
    messaging: number;
}

interface InsightItem {
    type: "success" | "warning" | "danger" | "info";
    icon: any;
    title: string;
    description: string;
    account?: string;
}

// ========================================
// HELPERS
// ========================================

function formatCurrency(v: number) {
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(v: number) {
    return v.toLocaleString("pt-BR");
}

function generateInsights(accounts: AccountData[]): InsightItem[] {
    const insights: InsightItem[] = [];

    for (const acc of accounts) {
        if (acc.spend === 0) continue;

        // CTR baixo
        if (acc.ctr < 0.5 && acc.impressions > 1000) {
            insights.push({
                type: "warning", icon: Eye,
                title: "CTR Muito Baixo",
                description: `"${acc.name}" com CTR ${acc.ctr.toFixed(2)}%. Criativos podem estar saturados.`,
                account: acc.name,
            });
        }

        // Frequência alta
        if (acc.frequency > 4) {
            insights.push({
                type: "warning", icon: AlertTriangle,
                title: "Frequência Alta",
                description: `"${acc.name}" com frequência ${acc.frequency.toFixed(1)}. Público pode estar saturado.`,
                account: acc.name,
            });
        }

        // Muitos leads
        if (acc.leads > 20) {
            insights.push({
                type: "success", icon: TrendingUp,
                title: "Bom Volume de Leads",
                description: `"${acc.name}" gerou ${acc.leads} leads nos últimos 7 dias.`,
                account: acc.name,
            });
        }

        // CPC alto
        if (acc.cpc > 5) {
            insights.push({
                type: "warning", icon: DollarSign,
                title: "CPC Elevado",
                description: `"${acc.name}" com CPC de R$ ${acc.cpc.toFixed(2)}. Considere otimizar segmentação.`,
                account: acc.name,
            });
        }

        // Leads + Messaging = conversas
        if (acc.messaging > 10) {
            insights.push({
                type: "info", icon: Lightbulb,
                title: "Bom Volume de Conversas",
                description: `"${acc.name}" iniciou ${acc.messaging} conversas nos últimos 7 dias.`,
                account: acc.name,
            });
        }
    }

    // Geral
    const totalSpend = accounts.reduce((s, a) => s + a.spend, 0);
    if (totalSpend > 0) {
        insights.push({
            type: "info", icon: BarChart3,
            title: "Investimento Total (7d)",
            description: `Total investido em todas as ${accounts.filter(a => a.spend > 0).length} contas ativas: ${formatCurrency(totalSpend)}.`,
        });
    }

    const priority: Record<string, number> = { danger: 0, warning: 1, success: 2, info: 3 };
    insights.sort((a, b) => (priority[a.type] ?? 4) - (priority[b.type] ?? 4));
    return insights;
}

// ========================================
// TOOLTIP
// ========================================

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload) return null;
    return (
        <div className="g-glass" style={{ padding: "0.75rem", background: "rgba(15,18,37,0.95)" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "0.25rem", fontSize: "0.75rem" }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: "white", fontWeight: 500, fontSize: "0.75rem" }}>
                    {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.value}
                </p>
            ))}
        </div>
    );
}

// ========================================
// SIDEBAR PAGES
// ========================================

const PAGES = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "insights", label: "Insights", icon: Lightbulb },
];

// ========================================
// MAIN COMPONENT
// ========================================

export default function MeuGestorDashboard() {
    const [currentPage, setCurrentPage] = useState("dashboard");
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [period, setPeriod] = useState("last_7d");

    const [accounts, setAccounts] = useState<AccountData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [detailCampaigns, setDetailCampaigns] = useState<CampaignData[]>([]);
    const [detailDaily, setDetailDaily] = useState<DailyData[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [campaignAds, setCampaignAds] = useState<AdData[]>([]);
    const [campaignDaily, setCampaignDaily] = useState<DailyData[]>([]);
    const [loadingCampaign, setLoadingCampaign] = useState(false);

    type SortConfig = { key: string, dir: "asc" | "desc" } | null;
    const [sortAccounts, setSortAccounts] = useState<SortConfig>(null);
    const [sortCampaigns, setSortCampaigns] = useState<SortConfig>(null);
    const [sortAds, setSortAds] = useState<SortConfig>(null);

    const [colsAccounts, setColsAccounts] = useState<Record<string, boolean>>({
        name: true, account_status: true, spend: true, cpc: true, ctr: true, leads: true, messaging: true
    });
    const [colsCampaigns, setColsCampaigns] = useState<Record<string, boolean>>({
        campaign_name: true, spend: true, impressions: true, clicks: true, ctr: true, cpc: true, leads: true, messaging: true
    });
    const [colsAds, setColsAds] = useState<Record<string, boolean>>({
        ad_name: true, spend: true, impressions: true, clicks: true, ctr: true, cpc: true, leads: true, messaging: true
    });

    const handleSort = (type: "accounts" | "campaigns" | "ads", key: string) => {
        const currentSort = type === "accounts" ? sortAccounts : type === "campaigns" ? sortCampaigns : sortAds;
        const setSort = type === "accounts" ? setSortAccounts : type === "campaigns" ? setSortCampaigns : setSortAds;
        
        if (currentSort?.key === key) {
            if (currentSort.dir === "desc") setSort({ key, dir: "asc" });
            else setSort(null);
        } else {
            setSort({ key, dir: "desc" });
        }
    };

    const renderSortIcon = (type: "accounts" | "campaigns" | "ads", key: string) => {
        const currentSort = type === "accounts" ? sortAccounts : type === "campaigns" ? sortCampaigns : sortAds;
        if (currentSort?.key !== key) return <ArrowUpDown style={{ width: 12, height: 12, opacity: 0.3, marginLeft: 4 }} />;
        if (currentSort.dir === "asc") return <ArrowUp style={{ width: 12, height: 12, color: "white", marginLeft: 4 }} />;
        return <ArrowDown style={{ width: 12, height: 12, color: "white", marginLeft: 4 }} />;
    };

    // ========================================
    // FETCH
    // ========================================

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/meugestor/accounts?period=${period}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Erro ao buscar contas");
            setAccounts(json.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchDetail = useCallback(async (accountId: string) => {
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/meugestor/accounts/${accountId}?period=${period}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setDetailCampaigns(json.data.campaigns);
            // Format daily dates
            const daily = json.data.daily.map((d: DailyData) => {
                const [, m, day] = d.date.split("-");
                return { ...d, date: `${day}/${m}` };
            });
            setDetailDaily(daily);
        } catch (err: any) {
            console.error("Detail error:", err);
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    const fetchCampaignDetail = useCallback(async (campaignId: string) => {
        setLoadingCampaign(true);
        try {
            const res = await fetch(`/api/meugestor/campaigns/${campaignId}?period=${period}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setCampaignAds(json.data.ads);
            const daily = json.data.daily.map((d: DailyData) => {
                const [, m, day] = d.date.split("-");
                return { ...d, date: `${day}/${m}` };
            });
            setCampaignDaily(daily);
        } catch (err: any) {
            console.error("Campaign detail error:", err);
        } finally {
            setLoadingCampaign(false);
        }
    }, [period]);

    const handleSelectAccount = useCallback((id: string) => {
        setSelectedAccountId(id);
        setSelectedCampaignId(null);
        fetchDetail(id);
    }, [fetchDetail]);

    const handleSelectCampaign = useCallback((id: string) => {
        setSelectedCampaignId(id);
        fetchCampaignDetail(id);
    }, [fetchCampaignDetail]);

    const handleBack = useCallback(() => {
        if (selectedCampaignId) {
            setSelectedCampaignId(null);
            setCampaignAds([]);
            setCampaignDaily([]);
        } else {
            setSelectedAccountId(null);
            setDetailCampaigns([]);
            setDetailDaily([]);
        }
    }, [selectedCampaignId]);

    // ========================================
    // COMPUTED
    // ========================================

    const activeAccounts = accounts.filter(a => a.spend > 0);
    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedAccounts = [...filteredAccounts].sort((a: any, b: any) => {
        if (!sortAccounts) return 0;
        const { key, dir } = sortAccounts;
        let valA = a[key], valB = b[key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
    });

    const sortedCampaigns = [...detailCampaigns].sort((a: any, b: any) => {
        if (!sortCampaigns) return 0;
        const { key, dir } = sortCampaigns;
        let valA = a[key], valB = b[key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
    });

    const sortedAds = [...campaignAds].sort((a: any, b: any) => {
        if (!sortAds) return 0;
        const { key, dir } = sortAds;
        let valA = a[key], valB = b[key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
    });

    const totalSpend = activeAccounts.reduce((s, a) => s + a.spend, 0);
    const totalClicks = activeAccounts.reduce((s, a) => s + a.clicks, 0);
    const totalLeads = activeAccounts.reduce((s, a) => s + a.leads, 0);
    const totalImpr = activeAccounts.reduce((s, a) => s + a.impressions, 0);
    const totalMessaging = activeAccounts.reduce((s, a) => s + a.messaging, 0);
    const overallCtr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;
    const overallCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const overallCpl = totalLeads > 0 ? totalSpend / totalLeads : null;

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const insights = generateInsights(accounts);

    const handleToggleStatus = async (id: string, currentStatus: string, type: 'campaign' | 'ad') => {
        // Meta API usa 'PAUSED' ou 'ACTIVE' (algumas vezes status vem numérico, mas POST requer string)
        const newStatus = currentStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
        if (!confirm(`Deseja realmente ${newStatus === 'PAUSED' ? 'PAUSAR' : 'ATIVAR'} est${type === 'campaign' ? 'a campanha' : 'e anúncio'}?`)) {
            return;
        }

        try {
            const res = await fetch('/api/meugestor/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            alert("Status atualizado com sucesso!");
            
            // Simular atualização local
            if (type === 'campaign') {
                setDetailCampaigns(prev => prev.map(c => c.campaign_id === id ? { ...c, status: newStatus } : c));
            } else {
                setCampaignAds(prev => prev.map(a => a.ad_id === id ? { ...a, status: newStatus } : a));
            }
        } catch (e: any) {
            alert("Erro ao alterar status: " + e.message);
        }
    };

    // ========================================
    // LOADING / ERROR
    // ========================================

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <Loader2 style={{ width: 48, height: 48, color: "#4c6ef5", margin: "0 auto 1rem" }} className="g-pulse" />
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>Carregando dados de todas as contas...</p>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: "0.5rem" }}>Isso pode levar alguns segundos</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="g-glass" style={{ padding: "2rem", textAlign: "center", maxWidth: 400 }}>
                    <AlertCircle style={{ width: 48, height: 48, color: "#f87171", margin: "0 auto 1rem" }} />
                    <h3 style={{ color: "white", fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Erro ao carregar</h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</p>
                    <button onClick={fetchData} className="g-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                        <RefreshCw style={{ width: 16, height: 16 }} /> Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    // ========================================
    // RENDER
    // ========================================

    return (
        <div style={{ minHeight: "100vh" }}>
            {/* Sidebar */}
            <aside style={{
                position: "fixed", left: 0, top: 0, bottom: 0, width: sidebarOpen ? 260 : 80, zIndex: 50,
                background: "rgba(10,12,28,0.95)", borderRight: "1px solid var(--glass-border)",
                backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", transition: "width 0.3s ease",
            }}>
                <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "space-between" : "center", padding: sidebarOpen ? "0 1.5rem" : "0", borderBottom: "1px solid var(--glass-border)" }}>
                    {sidebarOpen ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: 36, height: 36, borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gradient-primary)" }}>
                                <BarChart3 style={{ width: 20, height: 20, color: "white" }} />
                            </div>
                            <div>
                                <h1 style={{ color: "white", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>Meu Gestor</h1>
                                <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.3)", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Meta Ads</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gradient-primary)" }}>
                            <BarChart3 style={{ width: 20, height: 20, color: "white" }} />
                        </div>
                    )}
                    {sidebarOpen && (
                        <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                            <X style={{ width: 20, height: 20 }} />
                        </button>
                    )}
                </div>
                <nav style={{ flex: 1, padding: "1rem 0.5rem" }}>
                    {PAGES.map(page => {
                        const Icon = page.icon;
                        return (
                            <button key={page.id} onClick={() => { setCurrentPage(page.id); setSelectedAccountId(null); setSelectedCampaignId(null); }}
                                className={`g-sidebar-link ${currentPage === page.id ? "active" : ""}`} style={{ justifyContent: sidebarOpen ? "flex-start" : "center", padding: sidebarOpen ? "0.75rem 1rem" : "0.75rem" }}>
                                <Icon style={{ width: 20, height: 20 }} /> 
                                {sidebarOpen && <span>{page.label}</span>}
                            </button>
                        );
                    })}
                </nav>
                <div style={{ padding: "1rem", borderTop: "1px solid var(--glass-border)", textAlign: sidebarOpen ? "left" : "center" }}>
                    {sidebarOpen ? (
                        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>v2.0 — Direto da Meta API</p>
                    ) : (
                        <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.2)" }}>v2.0</p>
                    )}
                </div>
            </aside>

            {/* Main */}
            <main style={{ marginLeft: sidebarOpen ? 260 : 80, minHeight: "100vh", transition: "margin-left 0.3s ease" }}>
                {/* Top Bar */}
                <header style={{
                    position: "sticky", top: 0, zIndex: 40, height: 72,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 2rem", background: "rgba(15,18,37,0.85)",
                    borderBottom: "1px solid var(--glass-border)", backdropFilter: "blur(20px)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                <Menu style={{ width: 24, height: 24 }} />
                            </button>
                        )}
                        {(selectedAccountId || selectedCampaignId) && (
                            <button onClick={handleBack} style={{ padding: "0.5rem", borderRadius: "0.75rem", background: "none", border: "none", cursor: "pointer" }}>
                                <ChevronLeft style={{ width: 20, height: 20, color: "rgba(255,255,255,0.5)" }} />
                            </button>
                        )}
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, background: "linear-gradient(to right, white, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {currentPage === "dashboard"
                                ? (selectedCampaignId ? "Anúncios da Campanha" : (selectedAccountId ? (selectedAccount?.name || "Detalhes da Conta") : "Dashboard Geral"))
                                : "Insights da Operação"}
                        </h1>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <Calendar style={{ position: "absolute", left: 10, width: 14, height: 14, color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
                            <select value={period} onChange={e => setPeriod(e.target.value)}
                                style={{ appearance: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", padding: "0.5rem 2rem 0.5rem 2rem", fontSize: "0.75rem", color: "white", cursor: "pointer", outline: "none" }}>
                                {PERIODS.map(p => <option key={p.value} value={p.value} style={{ background: "#1a1d35" }}>{p.label}</option>)}
                            </select>
                        </div>
                        <button onClick={fetchData} className="g-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                            <RefreshCw style={{ width: 14, height: 14 }} /> Atualizar
                        </button>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>Hamilton Vinícius</span>
                            <span style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Gestor de Tráfego</span>
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: "rgba(76,110,245,0.2)", border: "1px solid rgba(76,110,245,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Users style={{ width: 20, height: 20, color: "#748ffc" }} />
                        </div>
                    </div>
                </header>

                <div style={{ padding: "2rem" }}>
                    {/* ======== DASHBOARD ======== */}
                    {currentPage === "dashboard" && !selectedAccountId && (
                        <div className="g-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                            {/* Overview Metrics */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                                {[
                                    { title: "Investimento Total (7d)", tooltip: "Valor total gasto em anúncios nos últimos 7 dias em todas as contas", value: formatCurrency(totalSpend), sub: `${activeAccounts.length} contas ativas`, color: "blue", icon: <DollarSign style={{ width: 20, height: 20 }} /> },
                                    { title: "Cliques Totais", tooltip: "Número total de cliques nos anúncios. Cada clique representa uma pessoa que interagiu com seu anúncio", value: formatNumber(totalClicks), sub: `CPC médio ${formatCurrency(overallCpc)}`, color: "yellow", icon: <MousePointerClick style={{ width: 20, height: 20 }} /> },
                                    { title: "CTR Médio", tooltip: "Taxa de Cliques (Click-Through Rate). Percentual de pessoas que viram o anúncio e clicaram. Quanto maior, melhor", value: `${overallCtr.toFixed(2)}%`, sub: `${formatNumber(totalImpr)} impressões`, color: "green", icon: <Target style={{ width: 20, height: 20 }} /> },
                                    { title: "Leads + Conversas", tooltip: "Leads são contatos captados via formulário. Conversas são interações iniciadas no WhatsApp/Messenger", value: `${totalLeads + totalMessaging}`, sub: `${totalLeads} leads · ${totalMessaging} conversas`, color: "blue", icon: <Users style={{ width: 20, height: 20 }} /> },
                                ].map((m, i) => (
                                    <div key={i} className={`g-glass g-glass-hover g-metric ${m.color}`} title={m.tooltip}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                                            <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "help" }}>{m.title}</p>
                                            <div style={{ color: "rgba(255,255,255,0.3)" }}>{m.icon}</div>
                                        </div>
                                        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>{m.value}</p>
                                        {m.sub && <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginTop: "0.5rem" }}>{m.sub}</p>}
                                    </div>
                                ))}
                            </div>

                            {/* Search + Accounts */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                    <div>
                                        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "white", marginBottom: "0.25rem" }}>Contas de Anúncio</h3>
                                        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                                            {filteredAccounts.length} contas · {filteredAccounts.filter(a => a.spend > 0).length} com gasto nos últimos 7d
                                        </p>
                                    </div>
                                    <div style={{ position: "relative" }}>
                                        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                                        <input
                                            type="text" placeholder="Buscar conta..."
                                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                            style={{
                                                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: "0.75rem", paddingLeft: 40, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                                                fontSize: "0.875rem", color: "white", outline: "none", width: 256,
                                            }}
                                        />
                                    </div>
                                </div>

                                {sortedAccounts.length === 0 ? (
                                    <div className="g-glass" style={{ padding: "2rem", textAlign: "center" }}>
                                        <p style={{ color: "rgba(255,255,255,0.5)" }}>Nenhuma conta encontrada.</p>
                                    </div>
                                ) : (
                                    <div className="g-glass" style={{ overflowX: "auto" }}>
                                        <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
                                            <details>
                                                <summary style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                                    ⚙️ Personalizar Colunas
                                                </summary>
                                                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                                                    {[
                                                        { key: "name", label: "Nome da Conta" }, { key: "account_status", label: "Status" },
                                                        { key: "spend", label: "Investimento" }, { key: "cpc", label: "CPC" },
                                                        { key: "ctr", label: "CTR" }, { key: "leads", label: "Leads" }, { key: "messaging", label: "Conversas" }
                                                    ].map(col => (
                                                        <label key={col.key} style={{ fontSize: "0.75rem", color: "white", display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer" }}>
                                                            <input type="checkbox" checked={colsAccounts[col.key]} onChange={() => setColsAccounts(prev => ({ ...prev, [col.key]: !prev[col.key] }))} style={{ accentColor: "#4c6ef5" }} />
                                                            {col.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                                            <thead>
                                                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                                                    {[
                                                        { label: "Nome da Conta", key: "name", align: "left" },
                                                        { label: "Status", key: "account_status", align: "left" },
                                                        { label: "Investimento", key: "spend", align: "right" },
                                                        { label: "CPC", key: "cpc", align: "right" },
                                                        { label: "CTR", key: "ctr", align: "right" },
                                                        { label: "Leads", key: "leads", align: "right" },
                                                        { label: "Conversas", key: "messaging", align: "right" }
                                                    ].filter(c => colsAccounts[c.key]).map((col) => (
                                                        <th key={col.key} onClick={() => handleSort("accounts", col.key)}
                                                            style={{ padding: "1rem", textAlign: col.align as any, color: "rgba(255,255,255,0.5)", fontWeight: 500, cursor: "pointer", userSelect: "none" }}>
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: col.align === "right" ? "flex-end" : "flex-start" }}>
                                                                {col.label} {renderSortIcon("accounts", col.key)}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedAccounts.map(acc => (
                                                    <tr key={acc.id} className="g-table-row" style={{ cursor: "pointer" }} onClick={() => handleSelectAccount(acc.id)}>
                                                        {colsAccounts.name && <td style={{ padding: "1rem", color: "white", fontWeight: 600 }}>{acc.name}</td>}
                                                        {colsAccounts.account_status && (
                                                            <td style={{ padding: "1rem" }}>
                                                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                                                    <span className={`g-badge ${acc.account_status === 1 ? "g-badge-success" : acc.account_status === 3 ? "g-badge-danger" : "g-badge-warning"}`}>
                                                                        {acc.account_status === 1 ? "Ativo" : acc.account_status === 3 ? "Restrito" : "Desativado"}
                                                                    </span>
                                                                    {acc.spend > 0 && <span className="g-badge g-badge-info">Gastando</span>}
                                                                </div>
                                                            </td>
                                                        )}
                                                        {colsAccounts.spend && <td style={{ padding: "1rem", textAlign: "right", color: "white", fontWeight: 500 }}>{formatCurrency(acc.spend)}</td>}
                                                        {colsAccounts.cpc && <td style={{ padding: "1rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{acc.cpc > 0 ? formatCurrency(acc.cpc) : "—"}</td>}
                                                        {colsAccounts.ctr && <td style={{ padding: "1rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{acc.ctr > 0 ? `${acc.ctr.toFixed(2)}%` : "—"}</td>}
                                                        {colsAccounts.leads && <td style={{ padding: "1rem", textAlign: "right", color: "#34d399", fontWeight: 600 }}>{acc.leads > 0 ? acc.leads : "—"}</td>}
                                                        {colsAccounts.messaging && <td style={{ padding: "1rem", textAlign: "right", color: "#60a5fa", fontWeight: 600 }}>{acc.messaging > 0 ? acc.messaging : "—"}</td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ======== ACCOUNT DETAIL ======== */}
                    {selectedAccountId && selectedAccount && !selectedCampaignId && (
                        <div className="g-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {/* Metric cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1rem" }}>
                                {[
                                    { title: "Investimento 7d", tooltip: "Valor total gasto em anúncios nos últimos 7 dias", value: formatCurrency(selectedAccount.spend), color: "blue", icon: <DollarSign style={{ width: 20, height: 20 }} /> },
                                    { title: "Cliques", tooltip: "Total de cliques nos anúncios desta conta", value: formatNumber(selectedAccount.clicks), color: "yellow", icon: <MousePointerClick style={{ width: 20, height: 20 }} /> },
                                    { title: "CTR", tooltip: "Taxa de Cliques — percentual de pessoas que viram e clicaram no anúncio", value: `${selectedAccount.ctr.toFixed(2)}%`, color: "green", icon: <Target style={{ width: 20, height: 20 }} /> },
                                    { title: "CPC", tooltip: "Custo Por Clique — quanto você paga em média por cada clique", value: formatCurrency(selectedAccount.cpc), color: "blue", icon: <DollarSign style={{ width: 20, height: 20 }} /> },
                                    { title: "Leads", tooltip: "Contatos captados via formulários de cadastro nos anúncios", value: selectedAccount.leads.toString(), color: "green", icon: <Users style={{ width: 20, height: 20 }} /> },
                                    { title: "Conversas", tooltip: "Conversas iniciadas no WhatsApp/Messenger a partir dos anúncios", value: selectedAccount.messaging.toString(), color: "blue", icon: <Users style={{ width: 20, height: 20 }} /> },
                                ].map((m, i) => (
                                    <div key={i} className={`g-glass g-metric ${m.color}`} title={m.tooltip}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                                            <p style={{ fontSize: "0.625rem", fontWeight: 500, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "help" }}>{m.title}</p>
                                            <div style={{ color: "rgba(255,255,255,0.3)" }}>{m.icon}</div>
                                        </div>
                                        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "white" }}>{m.value}</p>
                                    </div>
                                ))}
                            </div>

                            {loadingDetail ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                                    <Loader2 style={{ width: 32, height: 32, color: "rgba(255,255,255,0.3)" }} className="g-pulse" />
                                </div>
                            ) : (
                                <>
                                    {/* Charts */}
                                    {detailDaily.length > 0 && (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                            <div className="g-glass" style={{ padding: "1.25rem" }}>
                                                <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", marginBottom: "1rem" }}>Investimento Diário</h4>
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <BarChart data={detailDaily}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                        <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                                                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Bar dataKey="spend" name="Investimento (R$)" fill="#4c6ef5" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="g-glass" style={{ padding: "1.25rem" }}>
                                                <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", marginBottom: "1rem" }}>Cliques & Leads</h4>
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <LineChart data={detailDaily}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                        <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                                                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Line type="monotone" dataKey="clicks" name="Cliques" stroke="#748ffc" strokeWidth={2} dot={{ r: 3 }} />
                                                        <Line type="monotone" dataKey="leads" name="Leads" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Campaign Table */}
                                    <div className="g-glass" style={{ padding: "1.5rem" }}>
                                        <h4 style={{ fontSize: "1.125rem", fontWeight: 600, color: "white", marginBottom: "1rem" }}>Campanhas ({detailCampaigns.length})</h4>
                                        {detailCampaigns.length === 0 ? (
                                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>Nenhuma campanha com dados nos últimos 7 dias.</p>
                                        ) : (
                                            <div style={{ overflowX: "auto" }}>
                                                <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
                                                    <details>
                                                        <summary style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                                            ⚙️ Personalizar Colunas
                                                        </summary>
                                                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                                                            {[
                                                                { key: "campaign_name", label: "Campanha" }, { key: "spend", label: "Investimento" },
                                                                { key: "impressions", label: "Impressões" }, { key: "clicks", label: "Cliques" },
                                                                { key: "ctr", label: "CTR" }, { key: "cpc", label: "CPC" },
                                                                { key: "leads", label: "Leads" }, { key: "messaging", label: "Conversas" },
                                                                { key: "status", label: "Status" } // Added status column
                                                            ].map(col => (
                                                                <label key={col.key} style={{ fontSize: "0.75rem", color: "white", display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer" }}>
                                                                    <input type="checkbox" checked={colsCampaigns[col.key]} onChange={() => setColsCampaigns(prev => ({ ...prev, [col.key]: !prev[col.key] }))} style={{ accentColor: "#4c6ef5" }} />
                                                                    {col.label}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </details>
                                                </div>
                                                <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                                            {[
                                                                { label: "Campanha", key: "campaign_name", tip: "Nome da campanha no Facebook Ads", align: "left" },
                                                                { label: "Investimento", key: "spend", tip: "Valor gasto na campanha nos últimos 7 dias", align: "right" },
                                                                { label: "Impr.", key: "impressions", tip: "Impressões — quantas vezes o anúncio foi exibido", align: "right" },
                                                                { label: "Cliques", key: "clicks", tip: "Número de cliques recebidos", align: "right" },
                                                                { label: "CTR", key: "ctr", tip: "Taxa de Cliques — percentual de impressões que geraram clique", align: "right" },
                                                                { label: "CPC", key: "cpc", tip: "Custo Por Clique — investimento dividido pelo número de cliques", align: "right" },
                                                                { label: "Leads", key: "leads", tip: "Contatos captados via formulários", align: "right" },
                                                                { label: "Conversas", key: "messaging", tip: "Conversas iniciadas no WhatsApp/Messenger", align: "right" },
                                                                { label: "Ações", key: "status", tip: "Ações de status da campanha", align: "center" }, // Added status header
                                                            ].filter(c => colsCampaigns[c.key]).map(h => (
                                                                <th key={h.key} onClick={() => handleSort("campaigns", h.key)} title={h.tip} style={{ textAlign: h.align as any, fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0.75rem 0.5rem", cursor: "pointer", userSelect: "none" }}>
                                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: h.align === "left" ? "flex-start" : "flex-end" }}>
                                                                        {h.label} {renderSortIcon("campaigns", h.key)}
                                                                    </div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sortedCampaigns.map((c, i) => (
                                                            <tr key={i} className="g-table-row" style={{ cursor: "pointer" }} onClick={() => handleSelectCampaign(c.campaign_id)}>
                                                                {colsCampaigns.campaign_name && <td style={{ padding: "0.75rem 0.5rem", color: "white", fontWeight: 500, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.campaign_name}</td>}
                                                                {colsCampaigns.spend && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "white", fontWeight: 500 }}>{formatCurrency(c.spend)}</td>}
                                                                {colsCampaigns.impressions && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{formatNumber(c.impressions)}</td>}
                                                                {colsCampaigns.clicks && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{formatNumber(c.clicks)}</td>}
                                                                {colsCampaigns.ctr && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{c.ctr.toFixed(2)}%</td>}
                                                                {colsCampaigns.cpc && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{formatCurrency(c.cpc)}</td>}
                                                                {colsCampaigns.leads && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "#34d399", fontWeight: 600 }}>{c.leads}</td>}
                                                                {colsCampaigns.messaging && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: c.messaging > 0 ? "#60a5fa" : "rgba(255,255,255,0.7)", fontWeight: c.messaging > 0 ? 600 : 400 }}>{c.messaging}</td>}
                                                                {colsCampaigns.status && <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                                                                    <button className="g-btn-secondary" onClick={() => handleToggleStatus(c.campaign_id, (c as any).status || 'ACTIVE', 'campaign')} 
                                                                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", borderColor: "rgba(255,255,255,0.1)", background: "transparent" }}>
                                                                        {(c as any).status === 'PAUSED' ? <span style={{color: '#34d399'}}>▶ Ativar</span> : <span style={{color: '#f87171'}}>⏸ Pausar</span>}
                                                                    </button>
                                                                </td>}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ borderTop: "2px solid rgba(255,255,255,0.15)" }}>
                                                            {colsCampaigns.campaign_name && <td style={{ padding: "0.75rem 0.5rem", color: "white", fontWeight: 700 }}>Total</td>}
                                                            {colsCampaigns.spend && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "white", fontWeight: 700 }}>{formatCurrency(detailCampaigns.reduce((s, c) => s + c.spend, 0))}</td>}
                                                            {colsCampaigns.impressions && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{formatNumber(detailCampaigns.reduce((s, c) => s + c.impressions, 0))}</td>}
                                                            {colsCampaigns.clicks && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{formatNumber(detailCampaigns.reduce((s, c) => s + c.clicks, 0))}</td>}
                                                            {colsCampaigns.ctr && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                                                                {(() => {
                                                                    const ti = detailCampaigns.reduce((s, c) => s + c.impressions, 0);
                                                                    const tc = detailCampaigns.reduce((s, c) => s + c.clicks, 0);
                                                                    return ti > 0 ? ((tc / ti) * 100).toFixed(2) + "%" : "—";
                                                                })()}
                                                            </td>}
                                                            {colsCampaigns.cpc && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                                                                {(() => {
                                                                    const ts = detailCampaigns.reduce((s, c) => s + c.spend, 0);
                                                                    const tc = detailCampaigns.reduce((s, c) => s + c.clicks, 0);
                                                                    return tc > 0 ? formatCurrency(ts / tc) : "—";
                                                                })()}
                                                            </td>}
                                                            {colsCampaigns.leads && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "#34d399", fontWeight: 700 }}>{detailCampaigns.reduce((s, c) => s + c.leads, 0)}</td>}
                                                            {colsCampaigns.messaging && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "#60a5fa", fontWeight: 700 }}>{detailCampaigns.reduce((s, c) => s + c.messaging, 0)}</td>}
                                                            {colsCampaigns.status && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}></td>} {/* Empty cell for total row */}
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )} {/* End of Account Detail */}

                    {/* ======== CAMPAIGN DETAIL (ADS) ======== */}
                    {selectedAccountId && selectedCampaignId && (
                        <div className="g-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {loadingCampaign ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                                    <Loader2 style={{ width: 32, height: 32, color: "rgba(255,255,255,0.3)" }} className="g-pulse" />
                                </div>
                            ) : (
                                <>
                                    {/* Ads Table */}
                                    <div className="g-glass" style={{ padding: "1.5rem" }}>
                                        <h4 style={{ fontSize: "1.125rem", fontWeight: 600, color: "white", marginBottom: "1rem" }}>Criativos / Anúncios ({campaignAds.length})</h4>
                                        {campaignAds.length === 0 ? (
                                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>Nenhum anúncio com desempenho neste período.</p>
                                        ) : (
                                            <div style={{ overflowX: "auto" }}>
                                                <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
                                                    <details>
                                                        <summary style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                                            ⚙️ Personalizar Colunas
                                                        </summary>
                                                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                                                            {[
                                                                { key: "ad_name", label: "Anúncio" }, { key: "spend", label: "Investimento" },
                                                                { key: "impressions", label: "Impressões" }, { key: "clicks", label: "Cliques" },
                                                                { key: "ctr", label: "CTR" }, { key: "cpc", label: "CPC" },
                                                                { key: "leads", label: "Leads" }, { key: "messaging", label: "Conversas" },
                                                                { key: "status", label: "Status" } // Added status column
                                                            ].map(col => (
                                                                <label key={col.key} style={{ fontSize: "0.75rem", color: "white", display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer" }}>
                                                                    <input type="checkbox" checked={colsAds[col.key]} onChange={() => setColsAds(prev => ({ ...prev, [col.key]: !prev[col.key] }))} style={{ accentColor: "#4c6ef5" }} />
                                                                    {col.label}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </details>
                                                </div>
                                                <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                                            {[
                                                                { label: "Anúncio", key: "ad_name", tip: "Nome do Anúncio (Criativo + Copy)", align: "left" },
                                                                { label: "Investimento", key: "spend", tip: "Valor gasto no anúncio nos últimos 7 dias", align: "right" },
                                                                { label: "Impr.", key: "impressions", tip: "Impressões — quantas vezes o anúncio foi exibido", align: "right" },
                                                                { label: "Cliques", key: "clicks", tip: "Número de cliques recebidos", align: "right" },
                                                                { label: "CTR", key: "ctr", tip: "Taxa de Cliques", align: "right" },
                                                                { label: "CPC", key: "cpc", tip: "Custo Por Clique", align: "right" },
                                                                { label: "Leads", key: "leads", tip: "Contatos captados", align: "right" },
                                                                { label: "Conversas", key: "messaging", tip: "Conversas iniciadas", align: "right" },
                                                                { label: "Ações", key: "status", tip: "Ações de status do anúncio", align: "center" }, // Added status header
                                                            ].filter(c => colsAds[c.key]).map(h => (
                                                                <th key={h.key} onClick={() => handleSort("ads", h.key)} title={h.tip} style={{ textAlign: h.align as any, fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0.75rem 0.5rem", cursor: "pointer", userSelect: "none" }}>
                                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: h.align === "left" ? "flex-start" : "flex-end" }}>
                                                                        {h.label} {renderSortIcon("ads", h.key)}
                                                                    </div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sortedAds.map((a, i) => (
                                                            <tr key={i} className="g-table-row">
                                                                {colsAds.ad_name && <td style={{ padding: "0.75rem 0.5rem", color: "white", fontWeight: 500, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ad_name}</td>}
                                                                {colsAds.spend && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "white", fontWeight: 500 }}>{formatCurrency(a.spend)}</td>}
                                                                {colsAds.impressions && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{formatNumber(a.impressions)}</td>}
                                                                {colsAds.clicks && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{formatNumber(a.clicks)}</td>}
                                                                {colsAds.ctr && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{a.ctr.toFixed(2)}%</td>}
                                                                {colsAds.cpc && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{formatCurrency(a.cpc)}</td>}
                                                                {colsAds.leads && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "#34d399", fontWeight: 600 }}>{a.leads}</td>}
                                                                {colsAds.messaging && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: a.messaging > 0 ? "#60a5fa" : "rgba(255,255,255,0.7)", fontWeight: a.messaging > 0 ? 600 : 400 }}>{a.messaging}</td>}
                                                                {colsAds.status && <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                                                                    <button className="g-btn-secondary" onClick={() => handleToggleStatus(a.ad_id, (a as any).status || 'ACTIVE', 'ad')} 
                                                                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", borderColor: "rgba(255,255,255,0.1)", background: "transparent" }}>
                                                                        {(a as any).status === 'PAUSED' ? <span style={{color: '#34d399'}}>▶ Ativar</span> : <span style={{color: '#f87171'}}>⏸ Pausar</span>}
                                                                    </button>
                                                                </td>}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ borderTop: "2px solid rgba(255,255,255,0.15)" }}>
                                                            {colsAds.ad_name && <td style={{ padding: "0.75rem 0.5rem", color: "white", fontWeight: 700 }}>Total</td>}
                                                            {colsAds.spend && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "white", fontWeight: 700 }}>{formatCurrency(campaignAds.reduce((s, c) => s + c.spend, 0))}</td>}
                                                            {colsAds.impressions && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{formatNumber(campaignAds.reduce((s, c) => s + c.impressions, 0))}</td>}
                                                            {colsAds.clicks && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{formatNumber(campaignAds.reduce((s, c) => s + c.clicks, 0))}</td>}
                                                            {colsAds.ctr && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                                                                {(() => {
                                                                    const ti = campaignAds.reduce((s, c) => s + c.impressions, 0);
                                                                    const tc = campaignAds.reduce((s, c) => s + c.clicks, 0);
                                                                    return ti > 0 ? ((tc / ti) * 100).toFixed(2) + "%" : "—";
                                                                })()}
                                                            </td>}
                                                            {colsAds.cpc && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                                                                {(() => {
                                                                    const ts = campaignAds.reduce((s, c) => s + c.spend, 0);
                                                                    const tc = campaignAds.reduce((s, c) => s + c.clicks, 0);
                                                                    return tc > 0 ? formatCurrency(ts / tc) : "—";
                                                                })()}
                                                            </td>}
                                                            {colsAds.leads && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "#34d399", fontWeight: 700 }}>{campaignAds.reduce((s, c) => s + c.leads, 0)}</td>}
                                                            {colsAds.messaging && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "#60a5fa", fontWeight: 700 }}>{campaignAds.reduce((s, c) => s + c.messaging, 0)}</td>}
                                                            {colsAds.status && <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}></td>} {/* Empty cell for total row */}
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ======== INSIGHTS PAGE ======== */}
                    {currentPage === "insights" && (
                        <div className="g-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <div className="g-glass" style={{ padding: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                                    <div style={{ padding: "0.75rem", borderRadius: "0.75rem", background: "var(--gradient-primary)" }}>
                                        <Lightbulb style={{ width: 24, height: 24, color: "white" }} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "white" }}>Insights Automáticos</h3>
                                        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>
                                            Análise inteligente dos últimos 7 dias de {accounts.length} contas.
                                        </p>
                                    </div>
                                </div>

                                {insights.length === 0 ? (
                                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.875rem" }}>Nenhum insight gerado. Precisa de mais dados.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                        {insights.map((insight, i) => {
                                            const Icon = insight.icon;
                                            const colorMap: Record<string, { bg: string; icon: string }> = {
                                                success: { bg: "rgba(16,185,129,0.1)", icon: "rgba(52,211,153,1)" },
                                                danger: { bg: "rgba(239,68,68,0.1)", icon: "rgba(248,113,113,1)" },
                                                warning: { bg: "rgba(245,158,11,0.1)", icon: "rgba(251,191,36,1)" },
                                                info: { bg: "rgba(59,130,246,0.1)", icon: "rgba(96,165,250,1)" },
                                            };
                                            const colors = colorMap[insight.type] || colorMap.info;
                                            return (
                                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1rem", borderRadius: "0.75rem", background: colors.bg, border: `1px solid ${colors.icon}22` }}>
                                                    <div style={{ padding: "0.625rem", borderRadius: "0.75rem", background: `${colors.icon}22`, flexShrink: 0 }}>
                                                        <Icon style={{ width: 20, height: 20, color: colors.icon }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                                            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "white" }}>{insight.title}</p>
                                                            {insight.account && (
                                                                <span className={`g-badge g-badge-${insight.type === "success" ? "success" : insight.type === "danger" ? "danger" : insight.type === "warning" ? "warning" : "info"}`}
                                                                    style={{ fontSize: "0.625rem" }}>{insight.account}</span>
                                                            )}
                                                        </div>
                                                        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)" }}>{insight.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
