"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, ArrowLeft } from "lucide-react"
import Header from "@/components/Header"
import HistorySection from "@/components/HistorySection"
import PricingModal from "@/components/PricingModal"

export default function HistoryPage() {
    const { user, loading } = useAuth("/login")
    const router = useRouter()
    const [isPricingOpen, setIsPricingOpen] = useState(false)

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => router.push('/login')}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                </button>

                <h1 className="text-3xl font-bold text-white mb-2">Histórico</h1>
                <p className="text-zinc-400 mb-8">Veja suas criações anteriores.</p>

                <HistorySection />
            </main>

            <PricingModal
                isOpen={isPricingOpen}
                onClose={() => setIsPricingOpen(false)}
            />
        </div>
    )
}
