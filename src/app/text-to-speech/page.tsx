"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    Volume2,
    Loader2,
    Download,
    Play,
    Pause,
    ArrowLeft,
    Coins,
    AlertCircle,
    CheckCircle,
    Mic,
    Settings2
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"

const VOICES = [
    { id: "female", label: "Voz Feminina", icon: "👩" },
    { id: "male", label: "Voz Masculina", icon: "👨" },
    { id: "neutral", label: "Voz Neutra", icon: "🎙️" },
]

const LANGUAGES = [
    { id: "pt-BR", label: "Português (Brasil)" },
    { id: "pt-PT", label: "Português (Portugal)" },
    { id: "en-US", label: "English (US)" },
    { id: "es-ES", label: "Español" },
]

// Calcular créditos baseado em palavras
const calculateCredits = (text: string): number => {
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
    if (wordCount <= 100) return 20
    if (wordCount <= 500) return 100
    if (wordCount <= 1000) return 200
    return Math.ceil(wordCount / 5) // 0.2 créditos por palavra acima de 1000
}

export default function TextToSpeechPage() {
    const { data: session, status, update: updateSession } = useSession()
    const router = useRouter()
    const audioRef = useRef<HTMLAudioElement>(null)

    // Form state
    const [text, setText] = useState("")
    const [voice, setVoice] = useState("female")
    const [language, setLanguage] = useState("pt-BR")
    const [speed, setSpeed] = useState(1.0)

    // UI state
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState("")
    const [result, setResult] = useState<{ id: string; audioUrl: string; duration?: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)

    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
    const currentCredits = calculateCredits(text)

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

        if (!text.trim() || wordCount < 5) {
            setError("Digite pelo menos 5 palavras para gerar o áudio")
            return
        }

        if ((session.user.credits ?? 0) < currentCredits) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Iniciando síntese de voz...")

        try {
            const res = await fetch("/api/text-to-speech", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text.trim(),
                    voice,
                    language,
                    speed,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao gerar áudio")
            }

            const jobId = data.jobId

            // Polling
            setProcessingStatus("Gerando áudio com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/text-to-speech/status/${jobId}`)
                    const statusData = await statusRes.json()

                    if (statusData.status === "COMPLETED" || statusData.status === "completed") {
                        clearInterval(pollInterval)
                        setResult({
                            id: jobId,
                            audioUrl: statusData.audioUrl,
                            duration: statusData.duration,
                        })
                        setProcessingStatus("")
                        setIsProcessing(false)
                        await updateSession()
                    } else if (statusData.status === "FAILED" || statusData.status === "failed") {
                        clearInterval(pollInterval)
                        setError(statusData.error || "Erro ao gerar áudio. Tente novamente.")
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
        if (!result?.audioUrl) return
        const link = document.createElement("a")
        link.href = result.audioUrl
        link.download = `tts-${result.id}.mp3`
        link.click()
    }

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
            } else {
                audioRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const handleNewGeneration = () => {
        setResult(null)
        setError(null)
        setIsPlaying(false)
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
                        Text-to-Speech IA
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Transforme texto em áudio natural com vozes realistas geradas por inteligência artificial.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Text Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <Volume2 className="w-4 h-4" />
                                Digite seu texto
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Digite ou cole o texto que você deseja converter em áudio..."
                                className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none resize-none"
                                maxLength={5000}
                                disabled={isProcessing}
                            />
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span>{wordCount} palavras</span>
                                <span>{text.length}/5000 caracteres</span>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Voice */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Mic className="w-4 h-4" />
                                    Voz
                                </label>
                                <select
                                    value={voice}
                                    onChange={(e) => setVoice(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
                                    disabled={isProcessing}
                                >
                                    {VOICES.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.icon} {v.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Language */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Idioma</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
                                    disabled={isProcessing}
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Speed */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4" />
                                    Velocidade: {speed.toFixed(1)}x
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={speed}
                                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                    disabled={isProcessing}
                                />
                                <div className="flex justify-between text-xs text-zinc-500">
                                    <span>0.5x</span>
                                    <span>2x</span>
                                </div>
                            </div>
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
                            disabled={isProcessing || wordCount < 5}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3
                                ${isProcessing || wordCount < 5
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20"
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
                                    <Volume2 className="w-5 h-5" />
                                    Gerar Áudio ({currentCredits} créditos)
                                </>
                            )}
                        </button>

                        {/* Result */}
                        {result && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Áudio Gerado!
                                </h3>

                                {/* Audio Player */}
                                <div className="bg-zinc-800 rounded-xl p-4">
                                    <audio
                                        ref={audioRef}
                                        src={result.audioUrl}
                                        onEnded={() => setIsPlaying(false)}
                                        className="hidden"
                                    />
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={togglePlay}
                                            className="w-12 h-12 bg-violet-500 hover:bg-violet-400 rounded-full flex items-center justify-center transition-colors"
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-5 h-5 text-white" />
                                            ) : (
                                                <Play className="w-5 h-5 text-white ml-1" />
                                            )}
                                        </button>
                                        <div className="flex-1">
                                            <p className="text-sm text-white font-medium">Áudio TTS</p>
                                            <p className="text-xs text-zinc-400">
                                                {result.duration ? `${Math.round(result.duration)}s` : "Pronto para reproduzir"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download MP3
                                    </button>
                                    <button
                                        onClick={handleNewGeneration}
                                        className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Nova Geração
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="space-y-6">
                        {/* Credits Card */}
                        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-5">
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

                        {/* Pricing */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                            <h3 className="font-semibold text-white">Preços</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Até 100 palavras</span>
                                    <span className="text-yellow-400 font-semibold">20 créditos</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Até 500 palavras</span>
                                    <span className="text-yellow-400 font-semibold">100 créditos</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Até 1000 palavras</span>
                                    <span className="text-yellow-400 font-semibold">200 créditos</span>
                                </div>
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                            <h3 className="font-semibold text-white mb-3">💡 Dicas</h3>
                            <ul className="text-sm text-zinc-400 space-y-2">
                                <li>• Use pontuação para pausas naturais</li>
                                <li>• Números são lidos por extenso</li>
                                <li>• Evite emojis e caracteres especiais</li>
                                <li>• Ajuste a velocidade conforme necessário</li>
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
