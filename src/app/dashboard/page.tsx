"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Camera, Sparkles, Coins, Loader2 } from "lucide-react"
import DashboardCard from "@/components/DashboardCard"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"
import { useState } from "react"

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    // Redireciona para home se não estiver logado
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        }
    }, [status, router])

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => setShowLoginModal(true)}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                {/* Welcome Section */}
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Olá, {session.user?.name?.split(" ")[0] || "Usuário"}! 👋
                    </h1>
                    <p className="text-zinc-400">
                        O que você gostaria de criar hoje?
                    </p>
                </div>

                {/* Credits Card */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                            <Coins className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-400">Seus Créditos</p>
                            <p className="text-2xl font-bold text-white">
                                {session.user?.credits ?? 0}
                                <span className="text-sm font-normal text-zinc-400 ml-2">disponíveis</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsPricingOpen(true)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-zinc-900 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
                    >
                        Comprar Mais Créditos
                    </button>
                </div>

                {/* Services Grid */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-6">Nossos Serviços</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DashboardCard
                            title="Ensaio de IA"
                            description="Envie 3 fotos, escolha o modelo e tenha um ensaio de nível profissional gerado por inteligência artificial."
                            href="/ensaio"
                            icon={Camera}
                            iconBgColor="bg-purple-500/20"
                            iconColor="text-purple-400"
                        />
                        <DashboardCard
                            title="Face Swap"
                            description="Altere o rosto na foto que desejar. Troque rostos entre imagens de forma rápida e realista."
                            href="/face-swap"
                            icon={Sparkles}
                            iconBgColor="bg-pink-500/20"
                            iconColor="text-pink-400"
                        />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Suas Estatísticas</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-800/50 rounded-xl p-4">
                            <p className="text-sm text-zinc-400">Ensaios Gerados</p>
                            <p className="text-2xl font-bold text-white">-</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-4">
                            <p className="text-sm text-zinc-400">Face Swaps</p>
                            <p className="text-2xl font-bold text-white">-</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-4">
                            <p className="text-sm text-zinc-400">Créditos Usados</p>
                            <p className="text-2xl font-bold text-white">-</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-4">
                            <p className="text-sm text-zinc-400">Membro Desde</p>
                            <p className="text-lg font-bold text-white">
                                {new Date(session.user?.createdAt || Date.now()).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <PricingModal
                isOpen={isPricingOpen}
                onClose={() => setIsPricingOpen(false)}
            />

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </div>
    )
}
