"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import dynamic from 'next/dynamic'
import {
    Camera,
    Sparkles,
    Coins,
    Loader2,
    ImagePlus,
    Clock,
    History
} from "lucide-react"
import DashboardCard from "@/components/DashboardCard"
import Header from "@/components/Header"

// Lazy load modals - só carrega quando necessário
const PricingModal = dynamic(() => import('@/components/PricingModal'), {
    loading: () => null,
    ssr: false
})

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [credits, setCredits] = useState(0)
    const [userName, setUserName] = useState("")
    const [loading, setLoading] = useState(true)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const supabase = createClient()

    // TODO: Implementar lógica de expiração de créditos
    const showExpirationWarning = false

    useEffect(() => {
        // Verificar autenticação
        supabase.auth.getUser().then(({ data: { user }, error }) => {
            if (error || !user) {
                router.push("/login")
                return
            }

            setUser(user)

            // Buscar dados do usuário (nome e créditos)
            Promise.all([
                fetch('/api/user').then(res => res.json()),
                fetch('/api/credits/check-balance').then(res => res.json())
            ]).then(([userData, creditsData]) => {
                if (userData.user) {
                    setUserName(userData.user.name || '')
                    setCredits(userData.user.credits || 0)
                }
                if (creditsData.totalCredits !== undefined) {
                    setCredits(creditsData.totalCredits)
                }
                setLoading(false)
            }).catch(() => {
                setLoading(false)
            })
        })
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => router.push('/login')}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                {/* Welcome Section */}
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Olá, {userName?.split(" ")[0] || "Usuário"}! 👋
                    </h1>
                    <p className="text-zinc-400">
                        O que você gostaria de criar hoje?
                    </p>
                </div>

                {/* Credits & Expiration Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
                    {/* Credits Card */}
                    <div className="lg:col-span-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center shrink-0">
                                <Coins className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-zinc-400">Seus Créditos</p>
                                <p className="text-2xl font-bold text-white">
                                    {credits}
                                    <span className="text-sm font-normal text-zinc-400 ml-2">disponíveis</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsPricingOpen(true)}
                            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-zinc-900 px-6 py-3 min-h-[44px] rounded-xl font-bold text-sm transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
                        >
                            Comprar Mais
                        </button>
                    </div>

                    {/* Expiration Warning or Quick Action */}
                    {showExpirationWarning ? (
                        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-orange-400 mb-1">Créditos expirando</p>
                                    <p className="text-xs text-zinc-400">
                                        Seus créditos expiram em <span className="font-bold text-white">PLACEHOLDER</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/history')}
                            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all text-left group min-h-[44px]"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                                    <History className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors mb-1">Ver Histórico</p>
                                    <p className="text-xs text-zinc-500">Todas as suas criações</p>
                                </div>
                            </div>
                        </button>
                    )}
                </div>

                {/* Services Grid - IMAGENS */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        🎨 Ferramentas Disponíveis
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DashboardCard
                            title="Ensaio de IA"
                            description="Ensaio profissional com suas fotos"
                            href="/ensaio"
                            icon={Camera}
                            iconBgColor="bg-blue-500/20"
                            iconColor="text-blue-400"
                        />
                        <DashboardCard
                            title="Face Swap"
                            description="Troque rostos em imagens"
                            href="/face-swap"
                            icon={Sparkles}
                            iconBgColor="bg-pink-500/20"
                            iconColor="text-pink-400"
                            credits={5}
                        />
                        <DashboardCard
                            title="Upscale Imagem"
                            description="Aumente resolução até 4x"
                            href="/upscale-image"
                            icon={ImagePlus}
                            iconBgColor="bg-green-500/20"
                            iconColor="text-green-400"
                            credits={10}
                            isNew
                        />
                    </div>
                </div>
            </main>

            {/* Modals - lazy loaded */}
            {isPricingOpen && (
                <PricingModal
                    isOpen={isPricingOpen}
                    onClose={() => setIsPricingOpen(false)}
                />
            )}
        </div>
    )
}
