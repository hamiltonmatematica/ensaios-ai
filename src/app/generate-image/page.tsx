"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    Wand2,
    Loader2,
    Download,
    Share2,
    RefreshCw,
    ArrowLeft,
    Coins,
    Sparkles,
    Image as ImageIcon,
    AlertCircle,
    CheckCircle,
    Info
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"

const STYLES = [
    { id: "realistic", label: "Realista", icon: "📷" },
    { id: "anime", label: "Anime", icon: "🎌" },
    { id: "oil_painting", label: "Pintura a Óleo", icon: "🎨" },
    { id: "3d", label: "3D Render", icon: "🎮" },
    { id: "cartoon", label: "Cartoon", icon: "🖌️" },
]

const ASPECT_RATIOS = [
    { id: "1:1", label: "1:1 (Quadrado)", width: 1024, height: 1024 },
    { id: "16:9", label: "16:9 (Paisagem)", width: 1344, height: 768 },
    { id: "9:16", label: "9:16 (Retrato)", width: 768, height: 1344 },
    { id: "4:3", label: "4:3 (Clássico)", width: 1152, height: 896 },
]

const QUALITY_OPTIONS = [
    { id: "standard", label: "Standard", credits: 5, description: "Rápido, boa qualidade" },
    { id: "high", label: "High", credits: 15, description: "Equilibrado (recomendado)", recommended: true },
    { id: "ultra", label: "Ultra", credits: 25, description: "Máxima qualidade, mais lento" },
]

export default function GenerateImagePage() {
    const { data: session, status, update: updateSession } = useSession()
    const router = useRouter()

    // Form state
    const [prompt, setPrompt] = useState("")
    const [negativePrompt, setNegativePrompt] = useState("")
    const [style, setStyle] = useState("realistic")
    const [aspectRatio, setAspectRatio] = useState("1:1")
    const [quality, setQuality] = useState("high")

    // UI state
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState("")
    const [result, setResult] = useState<{ id: string; resultUrl: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    const currentCredits = QUALITY_OPTIONS.find(q => q.id === quality)?.credits || 15

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        }
    }, [status, router])

    const handleGenerate = async () => {
        setError(null)

        if (!session?.user) {
            setShowLoginModal(true)
            return
        }

        if (!prompt.trim()) {
            setError("Digite uma descrição para gerar a imagem")
            return
        }

        if ((session.user.credits ?? 0) < currentCredits) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Iniciando geração...")

        try {
            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    negativePrompt: negativePrompt.trim() || undefined,
                    style,
                    aspectRatio,
                    quality,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao gerar imagem")
            }

            const jobId = data.jobId

            // Polling
            setProcessingStatus("Gerando imagem com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/generate-image/status/${jobId}`)
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
                        setError(statusData.error || "Erro ao gerar imagem. Tente novamente.")
                        setProcessingStatus("")
                        setIsProcessing(false)
                    } else {
                        setProcessingStatus(`Gerando... ${statusData.status}`)
                    }
                } catch (e) {
                    console.error("Erro no polling:", e)
                }
            }, 3000)

            // Timeout 180s
            setTimeout(() => {
                clearInterval(pollInterval)
                if (isProcessing) {
                    setError("Tempo limite excedido. Tente novamente.")
                    setIsProcessing(false)
                    setProcessingStatus("")
                }
            }, 180000)

        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Erro ao gerar. Tente novamente."
            setError(errorMessage)
            setIsProcessing(false)
            setProcessingStatus("")
        }
    }

    const handleDownload = () => {
        if (!result?.resultUrl) return
        const link = document.createElement("a")
        link.href = result.resultUrl
        link.download = `ensaios-ai-${result.id}.png`
        link.click()
    }

    const handleNewGeneration = () => {
        setResult(null)
        setError(null)
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

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                </button>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Gerar Imagem com IA
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Descreva a imagem que você quer criar e nossa IA vai gerá-la em segundos usando FLUX.1
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Prompt */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <Wand2 className="w-4 h-4" />
                                Descreva sua imagem
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ex: Uma mulher elegante em um jardim florido ao pôr do sol, iluminação cinematográfica, alta qualidade..."
                                className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none resize-none"
                                maxLength={500}
                                disabled={isProcessing}
                            />
                            <p className="text-xs text-zinc-500 text-right">{prompt.length}/500</p>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Style */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Estilo</label>
                                <select
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                                    disabled={isProcessing}
                                >
                                    {STYLES.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.icon} {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Aspect Ratio */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Proporção</label>
                                <select
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                                    disabled={isProcessing}
                                >
                                    {ASPECT_RATIOS.map((ar) => (
                                        <option key={ar.id} value={ar.id}>
                                            {ar.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quality */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Qualidade</label>
                                <select
                                    value={quality}
                                    onChange={(e) => setQuality(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                                    disabled={isProcessing}
                                >
                                    {QUALITY_OPTIONS.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            {q.label} ({q.credits} cr) {q.recommended ? "⭐" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Negative Prompt */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Prompt Negativo (opcional)
                            </label>
                            <textarea
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="O que você NÃO quer na imagem: blur, baixa qualidade, texto, marca d'água..."
                                className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none resize-none"
                                disabled={isProcessing}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isProcessing || !prompt.trim()}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3
                                ${isProcessing || !prompt.trim()
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20"
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
                                    <Sparkles className="w-5 h-5" />
                                    Gerar Imagem ({currentCredits} créditos)
                                </>
                            )}
                        </button>

                        {/* Result */}
                        {result && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Imagem Gerada!
                                </h3>
                                <div className="rounded-xl overflow-hidden bg-black">
                                    <img
                                        src={result.resultUrl}
                                        alt="Generated"
                                        className="w-full h-auto max-h-[600px] object-contain"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                    <button
                                        onClick={handleNewGeneration}
                                        className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Nova Geração
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="space-y-6">
                        {/* Credits Card */}
                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-5">
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

                        {/* Pricing Info */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                Preços por Qualidade
                            </h3>
                            <div className="space-y-3">
                                {QUALITY_OPTIONS.map((q) => (
                                    <div
                                        key={q.id}
                                        className={`flex items-center justify-between p-3 rounded-lg ${quality === q.id ? "bg-purple-500/20 border border-purple-500/30" : "bg-zinc-800/50"
                                            }`}
                                    >
                                        <div>
                                            <p className="font-medium text-white">
                                                {q.label} {q.recommended && <span className="text-yellow-500">⭐</span>}
                                            </p>
                                            <p className="text-xs text-zinc-500">{q.description}</p>
                                        </div>
                                        <p className="text-yellow-400 font-bold">{q.credits} cr</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                            <h3 className="font-semibold text-white mb-3">💡 Dicas</h3>
                            <ul className="text-sm text-zinc-400 space-y-2">
                                <li>• Seja específico na descrição</li>
                                <li>• Mencione iluminação e estilo</li>
                                <li>• Use prompt negativo para evitar elementos indesejados</li>
                                <li>• Geração leva 10-30 segundos</li>
                            </ul>
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
