"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    Shirt,
    Loader2,
    Download,
    ArrowLeft,
    Coins,
    AlertCircle,
    CheckCircle,
    Upload,
    User,
    RefreshCw
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"

const CREDITS_COST = 20

const CLOTH_TYPES = [
    { id: "upper_body", label: "Parte Superior", description: "Camisetas, Casacos, Tops" },
    { id: "lower_body", label: "Parte Inferior", description: "Calças, Saias, Shorts" },
    { id: "dresses", label: "Vestidos", description: "Vestidos Completos" },
]

export default function VirtualTryOnPage() {
    const { data: session, status, update: updateSession } = useSession()
    const router = useRouter()

    // Form state
    const [personImage, setPersonImage] = useState<string | null>(null)
    const [garmentImage, setGarmentImage] = useState<string | null>(null)
    const [category, setCategory] = useState("upper_body")

    // UI state
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState("")
    const [result, setResult] = useState<{ id: string; resultUrl: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        }
    }, [status, router])

    const handleImageUpload = useCallback((file: File, type: 'person' | 'garment') => {
        if (!file.type.startsWith("image/")) {
            setError("Por favor, envie apenas imagens")
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("Imagem muito grande. Máximo 10MB")
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            if (type === 'person') setPersonImage(e.target?.result as string)
            else setGarmentImage(e.target?.result as string)
            setError(null)
        }
        reader.readAsDataURL(file)
    }, [])

    const handleTryOn = async () => {
        setError(null)

        if (!session?.user) {
            setShowLoginModal(true)
            return
        }

        if (!personImage || !garmentImage) {
            setError("Envie a foto da pessoa e da roupa")
            return
        }

        if ((session.user.credits ?? 0) < CREDITS_COST) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Enviando imagens...")

        try {
            const res = await fetch("/api/virtual-try-on", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    personImage,
                    garmentImage,
                    category,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao processar")
            }

            const jobId = data.jobId

            // Polling
            setProcessingStatus("Provando roupa com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/virtual-try-on/status/${jobId}`)
                    const statusData = await statusRes.json()

                    if (statusData.status === "COMPLETED" || statusData.status === "completed") {
                        clearInterval(pollInterval)
                        setResult({
                            id: jobId,
                            resultUrl: statusData.resultUrl,
                        })
                        setProcessingStatus("")
                        setIsProcessing(false)
                        await updateSession()
                    } else if (statusData.status === "FAILED" || statusData.status === "failed") {
                        clearInterval(pollInterval)
                        setError(statusData.error || "Erro no provador. Tente novamente.")
                        setProcessingStatus("")
                        setIsProcessing(false)
                    } else {
                        setProcessingStatus(`Processando... ${statusData.status}`)
                    }
                } catch (e) {
                    console.error("Erro no polling:", e)
                }
            }, 3000)

            setTimeout(() => {
                clearInterval(pollInterval)
                if (isProcessing) {
                    setError("Tempo limite excedido. Tente novamente.")
                    setIsProcessing(false)
                    setProcessingStatus("")
                }
            }, 120000) // 2 min timeout

        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Erro ao processar. Tente novamente."
            setError(errorMessage)
            setIsProcessing(false)
            setProcessingStatus("")
        }
    }

    const handleDownload = () => {
        if (!result?.resultUrl) return
        const link = document.createElement("a")
        link.href = result.resultUrl
        link.download = `try-on-${result.id}.png`
        link.click()
    }

    const handleReset = () => {
        setResult(null)
        setCategory("upper_body")
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    if (!session) return null

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => setShowLoginModal(true)}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                </button>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                        Provador Virtual (Try-On)
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Veja como qualquer roupa fica em você em segundos usando IA.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Inputs */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Person Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Sua Foto
                                </label>
                                <div
                                    className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all h-64 flex flex-col items-center justify-center ${personImage
                                            ? "border-indigo-500/50 bg-indigo-500/5"
                                            : "border-zinc-700 hover:border-zinc-600"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'person')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isProcessing}
                                    />
                                    {personImage ? (
                                        <img
                                            src={personImage}
                                            alt="Pessoa"
                                            className="max-h-full max-w-full rounded-lg object-contain"
                                        />
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="w-8 h-8 text-zinc-500 mx-auto" />
                                            <p className="text-xs text-zinc-400">Arraste ou clique</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Garment Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Shirt className="w-4 h-4" />
                                    Foto da Roupa
                                </label>
                                <div
                                    className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all h-64 flex flex-col items-center justify-center ${garmentImage
                                            ? "border-purple-500/50 bg-purple-500/5"
                                            : "border-zinc-700 hover:border-zinc-600"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'garment')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isProcessing}
                                    />
                                    {garmentImage ? (
                                        <img
                                            src={garmentImage}
                                            alt="Roupa"
                                            className="max-h-full max-w-full rounded-lg object-contain"
                                        />
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="w-8 h-8 text-zinc-500 mx-auto" />
                                            <p className="text-xs text-zinc-400">Arraste ou clique</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-300">
                                Tipo de Roupa
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {CLOTH_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setCategory(type.id)}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-xl border transition-all text-left ${category === type.id
                                                ? "border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/10"
                                                : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/30"
                                            }`}
                                    >
                                        <p className="font-bold text-sm text-white">{type.label}</p>
                                        <p className="text-[10px] text-zinc-400 mt-1">{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Button */}
                        <button
                            onClick={handleTryOn}
                            disabled={isProcessing || !personImage || !garmentImage}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3
                                ${isProcessing || !personImage || !garmentImage
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20"
                                }
                            `}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {processingStatus || "Processando..."}
                                </>
                            ) : (
                                <>
                                    <Shirt className="w-5 h-5" />
                                    Provador Virtual ({CREDITS_COST} créditos)
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right: Result or Info */}
                    <div className="space-y-6">
                        {result ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Resultado Pronto!
                                </h3>
                                <div className="rounded-xl overflow-hidden bg-black aspect-[3/4] relative">
                                    <img
                                        src={result.resultUrl}
                                        alt="Resultado"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Novo Teste
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Credits Card */}
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Coins className="w-6 h-6 text-yellow-500" />
                                        <span className="font-semibold text-white">Seus Créditos</span>
                                    </div>
                                    <p className="text-3xl font-bold text-white mb-3">
                                        {session.user?.credits ?? 0}
                                    </p>
                                    <button
                                        onClick={() => setIsPricingOpen(true)}
                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 py-2 rounded-lg font-semibold text-sm transition-colors"
                                    >
                                        Comprar Mais
                                    </button>
                                </div>

                                {/* How to */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">👔 Como funciona</h3>
                                    <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                                        <li>Envie sua foto de corpo inteiro ou meio corpo</li>
                                        <li>Envie a foto da roupa (pode ser foto de produto)</li>
                                        <li>Selecione o tipo (parte de cima, baixo ou vestido)</li>
                                        <li>A IA veste a roupa em você realisticamente!</li>
                                    </ol>
                                </div>

                                {/* Tips */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">💡 Dicas</h3>
                                    <ul className="text-sm text-zinc-400 space-y-2">
                                        <li>• Use fotos com boa iluminação</li>
                                        <li>• Evite poses muito complexas</li>
                                        <li>• A roupa deve estar visível e clara</li>
                                    </ul>
                                </div>
                            </>
                        )}
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
