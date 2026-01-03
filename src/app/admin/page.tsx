"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Image, Tag, Users, TrendingUp, MessageSquare } from "lucide-react"

interface Stats {
    totalModels: number
    totalTags: number
    totalGenerations: number
    totalUsers: number
}



export default function AdminDashboard() {
    const router = useRouter()
    const [stats, setStats] = useState<Stats>({
        totalModels: 0,
        totalTags: 0,
        totalGenerations: 0,
        totalUsers: 0
    })

    useEffect(() => {
        // Carregar estatísticas
        Promise.all([
            fetch("/api/admin/models").then(r => r.json()),
            fetch("/api/admin/tags").then(r => r.json()),
            fetch("/api/admin/users").then(r => r.json())
        ]).then(([modelsData, tagsData, usersData]) => {
            setStats(prev => ({
                ...prev,
                totalModels: modelsData.models?.length || 0,
                totalTags: tagsData.tags?.length || 0,
                totalUsers: usersData?.length || 0
            }))
        }).catch(console.error)
    }, [])

    const cards = [
        { label: "Modelos", description: "Gerenciar modelos de IA", value: stats.totalModels, icon: Image, color: "bg-blue-500", href: "/admin/models" },
        { label: "Usuários", description: "Ver usuários e gastos", value: stats.totalUsers, icon: Users, color: "bg-yellow-500", href: "/admin/users" },
        { label: "Histórico", description: "Estatísticas e atividades", value: stats.totalGenerations, icon: TrendingUp, color: "bg-green-500", href: "/admin/history" },
        { label: "Suporte", description: "Mensagens recebidas", value: "Ver", icon: MessageSquare, color: "bg-pink-500", href: "/admin/support" },
    ]

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Dashboard Admin</h1>
                        <p className="text-zinc-500">Visão geral do sistema</p>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Voltar ao Site
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {cards.map((card) => (
                        <div
                            key={card.label}
                            onClick={() => router.push(card.href)}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${card.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                                    <card.icon className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-2xl font-bold text-white">{card.value}</span>
                            </div>
                            <h3 className="font-semibold text-white mb-1">{card.label}</h3>
                            <p className="text-zinc-500 text-sm">{card.description}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Bem-vindo, Administrador</h2>
                    <p className="text-zinc-400 max-w-2xl leading-relaxed">
                        Este é o painel central de controle. Utilize os cards acima para navegar entre as diferentes áreas de gestão do Ensaios.AI
                    </p>
                </div>
            </div>
        </div>
    )
}
