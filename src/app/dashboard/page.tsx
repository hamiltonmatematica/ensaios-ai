"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
    Camera,
    Sparkles,
    Coins,
    Loader2,
    Wand2,
    ImagePlus,
    Volume2,
    Eraser
} from "lucide-react"
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

                {/* Services Grid - IMAGENS */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        🎨 Imagens
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DashboardCard
                            title="Gerar Imagem"
                            description="Crie imagens HD com IA usando FLUX.1"
                            href="/generate-image"
                            icon={Wand2}
                            iconBgColor="bg-purple-500/20"
                            iconColor="text-purple-400"
                            credits={15}
                            isNew
                        />
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
                        <DashboardCard
                            title="Inpaint / Remover"
                            description="Remova objetos de imagens"
                            href="/inpaint"
                            icon={Eraser}
                            iconBgColor="bg-rose-500/20"
                            iconColor="text-rose-400"
                            credits={15}
                            isNew
                        />
                    </div>
                </div>

                {/* Services Grid - ÁUDIO */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        🎧 Áudio
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DashboardCard
                            title="Text-to-Speech"
                            description="Transforme texto em áudio natural"
                            href="/text-to-speech"
                            icon={Volume2}
                            iconBgColor="bg-violet-500/20"
                            iconColor="text-violet-400"
                            credits={20}
                            isNew
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
                        <div className="text-center">
                            <p className="text-sm text-zinc-400">Seu ID</p>
                            <p className="text-sm font-medium text-white truncate max-w-[100px]">
                                {session.user?.id?.slice(0, 8)}...
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
