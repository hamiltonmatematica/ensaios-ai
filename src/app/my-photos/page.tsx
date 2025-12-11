
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import LoginModal from "@/components/LoginModal"
import PricingModal from "@/components/PricingModal"
import { Download, Calendar, ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react"

interface Generation {
    id: string
    resultUrl: string
    aspectRatio: string
    status: string
    createdAt: string
    model: {
        name: string
        thumbnailUrl: string
    }
}

export default function MyPhotosPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [generations, setGenerations] = useState<Generation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        }
    }, [status, router])

    useEffect(() => {
        if (session?.user) {
            fetchGenerations()
        }
    }, [session])

    const fetchGenerations = async () => {
        try {
            const res = await fetch("/api/generations")
            if (res.ok) {
                const data = await res.json()
                setGenerations(data)
            }
        } catch (error) {
            console.error("Erro ao carregar histórico:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => setShowLoginModal(true)}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push("/")}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-bold">Meus Ensaios</h1>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                    </div>
                ) : generations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border border-zinc-800 rounded-2xl bg-zinc-900/30">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">Nenhum ensaio encontrado</h3>
                        <p className="mb-6">Você ainda não gerou nenhuma foto.</p>
                        <button
                            onClick={() => router.push("/")}
                            className="bg-yellow-500 text-zinc-900 px-6 py-2 rounded-full font-bold hover:bg-yellow-400 transition-colors"
                        >
                            Criar meu primeiro ensaio
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {generations.map((gen) => (
                            <div key={gen.id} className="group bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-yellow-500/50 transition-all shadow-lg hover:shadow-yellow-500/10">
                                <div className="aspect-[3/4] bg-black relative overflow-hidden">
                                    {gen.resultUrl ? (
                                        <img
                                            src={gen.resultUrl}
                                            alt={`Ensaio ${gen.model.name}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span className="ml-2 text-xs">Processando...</span>
                                        </div>
                                    )}

                                    {/* Overlay com botão de download */}
                                    {gen.resultUrl && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <a
                                                href={gen.resultUrl}
                                                download={`ensaio-${gen.id}.png`}
                                                className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform"
                                                title="Baixar Foto"
                                            >
                                                <Download className="w-5 h-5" />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-zinc-200">{gen.model.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${gen.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                            gen.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {gen.status === 'COMPLETED' ? 'Concluído' : gen.status === 'FAILED' ? 'Falhou' : 'Processando'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(gen.createdAt).toLocaleDateString()}
                                        </span>
                                        <span>{gen.aspectRatio}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
