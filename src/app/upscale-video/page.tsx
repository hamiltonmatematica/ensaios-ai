"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    Video,
    Loader2,
    Download,
    ArrowLeft,
    Coins,
    AlertCircle,
    CheckCircle,
    Upload,
    ZoomIn,
    Play
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"

const SCALE_OPTIONS = [
    { id: "2x", label: "2x (1080p)", credits: 50, description: "HD → Full HD" },
    { id: "4x", label: "4x (4K)", credits: 100, description: "HD → 4K Ultra HD", recommended: true },
]

export default function UpscaleVideoPage() {
    const { data: session, status, update: updateSession } = useSession()
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)

    // Form state
    const [video, setVideo] = useState<string | null>(null)
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [scale, setScale] = useState("4x")

    // UI state
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState("")
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<{ id: string; resultUrl: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    const currentCredits = SCALE_OPTIONS.find(s => s.id === scale)?.credits || 100

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        }
    }, [status, router])

    const handleVideoUpload = (file: File) => {
        if (!file.type.startsWith("video/")) {
            setError("Por favor, envie apenas vídeos")
            return
        }

        // Limite de 100MB para vídeos
        if (file.size > 100 * 1024 * 1024) {
            setError("Vídeo muito grande. Máximo 100MB")
            return
        }

        setVideoFile(file)
        const url = URL.createObjectURL(file)
        setVideo(url)
        setError(null)
    }

    const handleUpscale = async () => {
        setError(null)

        if (!session?.user) {
            setShowLoginModal(true)
            return
        }

        if (!videoFile) {
            setError("Envie um vídeo para fazer upscale")
            return
        }

        if ((session.user.credits ?? 0) < currentCredits) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Enviando vídeo...")
        setProgress(10)

        try {
            // Converter vídeo para base64
            const reader = new FileReader()
            const videoBase64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(videoFile)
            })

            setProgress(30)
            setProcessingStatus("Iniciando processamento...")

            const res = await fetch("/api/upscale-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    video: videoBase64,
                    scale,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao fazer upscale")
            }

            const jobId = data.jobId
            setProgress(50)

            // Polling
            setProcessingStatus("Processando vídeo com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/upscale-video/status/${jobId}`)
                    const statusData = await statusRes.json()

                    if (statusData.status === "COMPLETED" || statusData.status === "completed") {
                        clearInterval(pollInterval)
                        setProgress(100)
                        setResult({
                            id: jobId,
                            resultUrl: statusData.resultUrl,
                        })
                        setProcessingStatus("")
                        setIsProcessing(false)
                        await updateSession()
                    } else if (statusData.status === "FAILED" || statusData.status === "failed") {
                        clearInterval(pollInterval)
                        setError(statusData.error || "Erro no upscale. Tente novamente.")
                        setProcessingStatus("")
                        setIsProcessing(false)
                    } else {
                        // Simular progresso
                        setProgress(prev => Math.min(prev + 5, 90))
                        setProcessingStatus(`Processando... ${statusData.status}`)
                    }
                } catch (e) {
                    console.error("Erro no polling:", e)
                }
            }, 5000) // Vídeos demoram mais

            // Timeout 10 minutos para vídeos
            setTimeout(() => {
                clearInterval(pollInterval)
                if (isProcessing) {
                    setError("Tempo limite excedido. Tente novamente.")
                    setIsProcessing(false)
                    setProcessingStatus("")
                }
            }, 600000)

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
        link.download = `video-upscale-${result.id}.mp4`
        link.click()
    }

    const handleNewUpscale = () => {
        setResult(null)
        setVideo(null)
        setVideoFile(null)
        setError(null)
        setProgress(0)
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                        Video Upscale
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Aumente a resolução dos seus vídeos para Full HD ou 4K usando IA.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Upload */}
                    <div className="space-y-6">
                        {/* Upload Area */}
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${video
                                    ? "border-orange-500/50 bg-orange-500/5"
                                    : "border-zinc-700 hover:border-zinc-600"
                                }`}
                        >
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isProcessing}
                            />
                            {video ? (
                                <div className="space-y-4">
                                    <video
                                        ref={videoRef}
                                        src={video}
                                        className="max-h-48 mx-auto rounded-lg"
                                        controls
                                    />
                                    <p className="text-sm text-zinc-400">
                                        {videoFile?.name}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {((videoFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Video className="w-12 h-12 text-zinc-500 mx-auto" />
                                    <div>
                                        <p className="text-white font-medium">
                                            Arraste um vídeo ou clique para selecionar
                                        </p>
                                        <p className="text-sm text-zinc-500 mt-1">
                                            MP4, MOV, AVI até 100MB
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Scale Options */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <ZoomIn className="w-4 h-4" />
                                Escala de Upscale
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {SCALE_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setScale(option.id)}
                                        disabled={isProcessing}
                                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${scale === option.id
                                                ? "border-orange-400 bg-orange-500/20 scale-105 shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/50"
                                                : "border-zinc-700 hover:border-zinc-500"
                                            }`}
                                    >
                                        {option.recommended && (
                                            <span className="absolute -top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                RECOMENDADO
                                            </span>
                                        )}
                                        <p className="text-xl font-bold text-white">{option.label}</p>
                                        <p className="text-xs text-zinc-400">{option.description}</p>
                                        <p className="text-sm text-yellow-400 font-semibold mt-2">
                                            {option.credits} créditos
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">{processingStatus}</span>
                                    <span className="text-orange-400 font-medium">{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Button */}
                        <button
                            onClick={handleUpscale}
                            disabled={isProcessing || !video}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3
                                ${isProcessing || !video
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-orange-500/20"
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
                                    <Video className="w-5 h-5" />
                                    Fazer Upscale ({currentCredits} créditos)
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
                                    Upscale Concluído!
                                </h3>
                                <div className="rounded-xl overflow-hidden bg-black">
                                    <video
                                        src={result.resultUrl}
                                        className="w-full h-auto"
                                        controls
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                    <button
                                        onClick={handleNewUpscale}
                                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        Novo Upscale
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Credits Card */}
                                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-5">
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

                                {/* Info */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">📽️ Como funciona</h3>
                                    <ul className="text-sm text-zinc-400 space-y-2">
                                        <li>1. Envie seu vídeo (até 100MB)</li>
                                        <li>2. Escolha a escala (2x ou 4x)</li>
                                        <li>3. Nossa IA processa frame a frame</li>
                                        <li>4. Baixe o vídeo em alta qualidade</li>
                                    </ul>
                                </div>

                                {/* Tips */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">⚡ Dicas</h3>
                                    <ul className="text-sm text-zinc-400 space-y-2">
                                        <li>• Vídeos curtos processam mais rápido</li>
                                        <li>• 4K é ideal para TVs e monitores grandes</li>
                                        <li>• Tempo médio: 2-5 minutos por minuto de vídeo</li>
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
