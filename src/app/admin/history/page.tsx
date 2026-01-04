
"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, TrendingUp, Users, Coins, Zap, Image, User, Calendar, Filter, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface PlatformStats {
    totalUsers: number
    totalGenerations: number
    totalRevenue: number
    totalCreditsUsed: number
    generationsByType: {
        ensaio: number
        faceSwap: number
        upscale: number
    }
    recentActivity: Activity[]
}

interface Activity {
    id: string
    type: 'generation' | 'purchase'
    userName: string
    userEmail: string
    details: string
    credits?: number
    amount?: number
    createdAt: string
}

export default function AdminHistoryPage() {
    const router = useRouter()
    const [stats, setStats] = useState<PlatformStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'generation' | 'purchase'>('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchStats()
    }, [])

    async function fetchStats() {
        try {
            const res = await fetch("/api/admin/history")
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (error) {
            console.error("Erro ao carregar estatísticas", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-zinc-500">Erro ao carregar dados</p>
                </div>
            </div>
        )
    }

    const filteredActivities = stats.recentActivity.filter(activity => {
        if (filter !== 'all' && activity.type !== filter) return false
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            return (
                activity.userName.toLowerCase().includes(searchLower) ||
                activity.userEmail.toLowerCase().includes(searchLower) ||
                activity.details.toLowerCase().includes(searchLower)
            )
        }
        return true
    })

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push("/admin")}
                        className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Histórico & Estatísticas</h1>
                        <p className="text-zinc-500">Visão completa das atividades da plataforma</p>
                    </div>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Users */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-purple-400" />
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stats.totalUsers}</div>
                        <div className="text-zinc-400 text-sm">Usuários Totais</div>
                    </div>

                    {/* Total Generations */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Zap className="w-8 h-8 text-blue-400" />
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stats.totalGenerations}</div>
                        <div className="text-zinc-400 text-sm">Gerações Totais</div>
                    </div>

                    {/* Total Revenue */}
                    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Coins className="w-8 h-8 text-green-400" />
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="text-3xl font-bold mb-1">
                            {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-zinc-400 text-sm">Receita Total</div>
                    </div>

                    {/* Credits Used */}
                    <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Image className="w-8 h-8 text-yellow-400" />
                            <TrendingUp className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stats.totalCreditsUsed}</div>
                        <div className="text-zinc-400 text-sm">Créditos Usados</div>
                    </div>
                </div>

                {/* Generation Breakdown */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Image className="w-5 h-5 text-yellow-500" />
                        Gerações por Tipo
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                            <div className="text-sm text-zinc-400 mb-1">Ensaio de IA</div>
                            <div className="text-2xl font-bold text-purple-400">{stats.generationsByType.ensaio}</div>
                        </div>
                        <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                            <div className="text-sm text-zinc-400 mb-1">Face Swap</div>
                            <div className="text-2xl font-bold text-blue-400">{stats.generationsByType.faceSwap}</div>
                        </div>
                        <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                            <div className="text-sm text-zinc-400 mb-1">Upscale</div>
                            <div className="text-2xl font-bold text-green-400">{stats.generationsByType.upscale}</div>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800">
                        <h2 className="text-xl font-bold mb-4">Atividades Recentes</h2>

                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setFilter('generation')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'generation'
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                >
                                    Gerações
                                </button>
                                <button
                                    onClick={() => setFilter('purchase')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'purchase'
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                >
                                    Compras
                                </button>
                            </div>

                            <div className="flex-1">
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar por usuário ou ação..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-2 text-sm focus:border-yellow-500 outline-none"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity List */}
                    <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
                        {filteredActivities.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500">
                                Nenhuma atividade encontrada
                            </div>
                        ) : (
                            filteredActivities.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="p-4 hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${activity.type === 'generation'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            {activity.type === 'generation' ? (
                                                <Zap className="w-5 h-5" />
                                            ) : (
                                                <Coins className="w-5 h-5" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-4 h-4 text-zinc-500" />
                                                <span className="font-medium text-white">{activity.userName}</span>
                                                <span className="text-zinc-500 text-sm">•</span>
                                                <span className="text-zinc-500 text-sm">{activity.userEmail}</span>
                                            </div>
                                            <p className="text-zinc-300 text-sm mb-2">{activity.details}</p>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(activity.createdAt).toLocaleString('pt-BR')}
                                                </div>
                                                {activity.credits !== undefined && (
                                                    <div className="flex items-center gap-1 text-yellow-500">
                                                        <Coins className="w-3 h-3" />
                                                        {activity.credits} créditos
                                                    </div>
                                                )}
                                                {activity.amount !== undefined && (
                                                    <div className="flex items-center gap-1 text-green-500">
                                                        <Coins className="w-3 h-3" />
                                                        {activity.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
