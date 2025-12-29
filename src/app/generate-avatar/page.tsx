"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    UserCircle,
    Loader2,
    Download,
    ArrowLeft,
    Coins,
    AlertCircle,
    CheckCircle,
    Upload,
    Mic,
    Play
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"

const CREDITS_COST = 100

export default function GenerateAvatarPage() {
    const { data: session, status, update: updateSession } = useSession()
    const router = useRouter()

    // Form state
    const [faceImage, setFaceImage] = useState<string | null>(null)
    const [faceFile, setFaceFile] = useState<File | null>(null)
    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)

    // UI state
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState("")
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<{ id: string; resultUrl: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        }
    }, [status, router])

    const handleFaceUpload = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Por favor, envie apenas imagens")
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("Imagem muito grande. Máximo 10MB")
            return
        }

        setFaceFile(file)
        const reader = new FileReader()
        reader.onload = (e) => {
            setFaceImage(e.target?.result as string)
            setError(null)
        }
        reader.readAsDataURL(file)
    }, [])

    const handleAudioUpload = useCallback((file: File) => {
        if (!file.type.startsWith("audio/")) {
            setError("Por favor, envie apenas arquivos de áudio")
            return
        }

        if (file.size > 20 * 1024 * 1024) {
            setError("Áudio muito grande. Máximo 20MB")
            return
        }

        setAudioFile(file)
        setAudioUrl(URL.createObjectURL(file))
        setError(null)
    }, [])

    const handleGenerate = async () => {
        setError(null)

        if (!session?.user) {
            setShowLoginModal(true)
            return
        }

        if (!faceImage) {
            setError("Envie uma foto do rosto")
            return
        }

        if (!audioFile) {
            setError("Envie um arquivo de áudio")
            return
        }

        if ((session.user.credits ?? 0) < CREDITS_COST) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Enviando arquivos...")
        setProgress(10)

        try {
            // Converter áudio para base64
            const audioBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(audioFile)
            })

            setProgress(30)
            setProcessingStatus("Gerando avatar...")

            const res = await fetch("/api/generate-avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    faceImage,
                    audio: audioBase64,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao gerar avatar")
            }

            const jobId = data.jobId
            setProgress(50)

            // Polling
            setProcessingStatus("Processando lip-sync com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/generate-avatar/status/${jobId}`)
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
                        setError(statusData.error || "Erro na geração. Tente novamente.")
                        setProcessingStatus("")
                        setIsProcessing(false)
                    } else {
                        setProgress(prev => Math.min(prev + 5, 90))
                        setProcessingStatus(`Processando... ${statusData.status}`)
                    }
                } catch (e) {
                    console.error("Erro no polling:", e)
                }
            }, 4000)

            // Timeout 5 minutos
            setTimeout(() => {
                clearInterval(pollInterval)
                if (isProcessing) {
                    setError("Tempo limite excedido. Tente novamente.")
                    setIsProcessing(false)
                    setProcessingStatus("")
                }
            }, 300000)

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
        link.download = `avatar-${result.id}.mp4`
        link.click()
    }

    const handleReset = () => {
        setResult(null)
        setFaceImage(null)
        setFaceFile(null)
        setAudioFile(null)
        setAudioUrl(null)
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                        Gerador de Avatar
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Crie um vídeo do seu rosto falando qualquer áudio com lip-sync perfeito.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Inputs */}
                    <div className="space-y-6">
                        {/* Face Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <UserCircle className="w-4 h-4" />
                                Foto do Rosto
                            </label>
                            <div
                                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${faceImage
                                        ? "border-emerald-500/50 bg-emerald-500/5"
                                        : "border-zinc-700 hover:border-zinc-600"
                                    }`}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleFaceUpload(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isProcessing}
                                />
                                {faceImage ? (
                                    <img
                                        src={faceImage}
                                        alt="Face"
                                        className="max-h-40 mx-auto rounded-lg"
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="w-8 h-8 text-zinc-500 mx-auto" />
                                        <p className="text-sm text-zinc-400">Envie uma foto frontal</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audio Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <Mic className="w-4 h-4" />
                                Áudio para Lip-Sync
                            </label>
                            <div
                                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${audioUrl
                                        ? "border-emerald-500/50 bg-emerald-500/5"
                                        : "border-zinc-700 hover:border-zinc-600"
                                    }`}
                            >
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isProcessing}
                                />
                                {audioUrl ? (
                                    <div className="space-y-2">
                                        <audio src={audioUrl} controls className="w-full" />
                                        <p className="text-xs text-zinc-400">{audioFile?.name}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Mic className="w-8 h-8 text-zinc-500 mx-auto" />
                                        <p className="text-sm text-zinc-400">Envie um áudio (MP3, WAV)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Progress */}
                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">{processingStatus}</span>
                                    <span className="text-emerald-400 font-medium">{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
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
                            onClick={handleGenerate}
                            disabled={isProcessing || !faceImage || !audioUrl}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3
                                ${isProcessing || !faceImage || !audioUrl
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                                }
                            `}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {processingStatus || "Gerando..."}
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    Gerar Avatar ({CREDITS_COST} créditos)
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
                                    Avatar Gerado!
                                </h3>
                                <div className="rounded-xl overflow-hidden bg-black">
                                    <video
                                        src={result.resultUrl}
                                        className="w-full h-auto"
                                        controls
                                        autoPlay
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        Novo Avatar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Credits Card */}
                                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5">
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
                                    <h3 className="font-semibold text-white mb-3">🎭 Como funciona</h3>
                                    <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                                        <li>Envie uma foto frontal do rosto</li>
                                        <li>Envie um áudio (fala, música, etc)</li>
                                        <li>A IA cria um vídeo com lip-sync</li>
                                        <li>Baixe e use nas redes sociais!</li>
                                    </ol>
                                </div>

                                {/* Tips */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">💡 Dicas</h3>
                                    <ul className="text-sm text-zinc-400 space-y-2">
                                        <li>• Use fotos frontais com fundo neutro</li>
                                        <li>• Áudios de até 60s funcionam melhor</li>
                                        <li>• Ideal para vídeos de marketing</li>
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
