"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import {
    ImagePlus,
    Loader2,
    Download,
    ArrowLeft,
    Coins,
    AlertCircle,
    CheckCircle,
    Upload,
    ZoomIn
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"


const SCALE_OPTIONS = [
    { id: "2x", label: "2x", credits: 10, description: "Dobra a resolução" },
    { id: "4x", label: "4x", credits: 20, description: "Quadruplica a resolução", recommended: true },
]

export default function UpscaleImagePage() {
    const { user, loading, credits, refreshCredits } = useAuth("/login")
    const router = useRouter()

    // Form state
    const [image, setImage] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [scale, setScale] = useState("4x")

    // UI state
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState("")
    const [result, setResult] = useState<{ id: string; resultUrl: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPricingOpen, setIsPricingOpen] = useState(false)

    const [retryCount, setRetryCount] = useState(0)

    const currentCredits = SCALE_OPTIONS.find(s => s.id === scale)?.credits || 20
    const MAX_RETRIES = 12 // 12 tentativas x 5s = 60 segundos

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    let width = img.width
                    let height = img.height

                    // Limite reduzido para evitar CUDA Out of Memory (9GB alloc / 24GB total)
                    // 1500 * 4 = 6000px (6k resolução final) - Muito mais seguro
                    const MAX_DIMENSION = 1500

                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height = (height / width) * MAX_DIMENSION
                            width = MAX_DIMENSION
                        } else {
                            width = (width / height) * MAX_DIMENSION
                            height = MAX_DIMENSION
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx?.drawImage(img, 0, 0, width, height)

                    // Converte para JPEG com qualidade 90%
                    resolve(canvas.toDataURL('image/jpeg', 0.9))
                }
                img.src = e.target?.result as string
            }
            reader.readAsDataURL(file)
        })
    }

    const handleImageUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Por favor, envie apenas imagens")
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("Imagem muito grande. Máximo 10MB")
            return
        }

        setImageFile(file)

        try {
            // Redimensiona se necessário antes de setar
            const resizedBase64 = await resizeImage(file)
            setImage(resizedBase64)
            setError(null)
        } catch (e) {
            console.error("Erro ao processar imagem:", e)
            setError("Erro ao processar imagem")
        }
    }, [])

    const handleUpscale = async () => {
        setError(null)

        if (!user) {
            router.push("/login")
            return
        }

        if (!image) {
            setError("Envie uma imagem para fazer upscale")
            return
        }

        if ((credits ?? 0) < currentCredits) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Preparando sua imagem...")

        try {
            const res = await fetch("/api/upscale-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image,
                    scale,
                }),
            })

            const data = await res.json()

            // Tratar cold start - servidor inicializando
            if (res.status === 503 && data.coldStart) {
                // Verificar limite de tentativas
                if (retryCount >= MAX_RETRIES) {
                    setError(`Endpoint demorando muito para inicializar (${retryCount} tentativas). Aguarde alguns minutos ou verifique o painel do RunPod.`)
                    setIsProcessing(false)
                    setProcessingStatus("")
                    setRetryCount(0)
                    return
                }

                const retryAfter = data.retryAfter || 5
                setRetryCount(prev => prev + 1)
                setProcessingStatus(`Preparando servidor... Aguarde um momento`)

                setTimeout(() => {
                    handleUpscale() // Retry recursivo
                }, retryAfter * 1000)
                return
            }

            // Reset retry counter em caso de sucesso
            setRetryCount(0)

            if (!res.ok) {
                throw new Error(data.error || "Erro ao fazer upscale")
            }

            const jobId = data.jobId

            // Se o resultado já vier na resposta (síncrono)
            if (data.resultUrl) {
                setResult({
                    id: jobId,
                    resultUrl: data.resultUrl,
                })
                setProcessingStatus("")
                setIsProcessing(false)
                await refreshCredits()
                return
            }

            // Polling
            setProcessingStatus("Melhorando sua imagem...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/upscale-image/status/${jobId}`)
                    const statusData = await statusRes.json()

                    if (statusData.status === "COMPLETED" || statusData.status === "completed") {
                        clearInterval(pollInterval)
                        setResult({
                            id: jobId,
                            resultUrl: statusData.resultUrl,
                        })
                        setProcessingStatus("")
                        setIsProcessing(false)
                        await refreshCredits()
                    } else if (statusData.status === "FAILED" || statusData.status === "failed") {
                        clearInterval(pollInterval)
                        setError(statusData.error || "Erro no upscale. Tente novamente.")
                        setProcessingStatus("")
                        setIsProcessing(false)
                    } else {
                        setProcessingStatus("Aplicando melhoria de qualidade...")
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
            }, 180000)

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
        link.download = `upscale-${result.id}.png`
        link.click()
    }

    const handleNewUpscale = () => {
        setResult(null)
        setImage(null)
        setImageFile(null)
        setError(null)
    }

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
                onOpenLogin={() => router.push("/login")}
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                        Upscale de Imagem
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Aumente a resolução das suas imagens até 4x usando IA avançada.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Upload */}
                    <div className="space-y-6">
                        {/* Upload Area */}
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${image
                                ? "border-green-500/50 bg-green-500/5"
                                : "border-zinc-700 hover:border-zinc-600"
                                }`}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isProcessing}
                            />
                            {image ? (
                                <div className="space-y-4">
                                    <img
                                        src={image}
                                        alt="Preview"
                                        className="max-h-64 mx-auto rounded-lg"
                                    />
                                    <p className="text-sm text-zinc-400">
                                        {imageFile?.name}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Upload className="w-12 h-12 text-zinc-500 mx-auto" />
                                    <div>
                                        <p className="text-white font-medium">
                                            Arraste uma imagem ou clique para selecionar
                                        </p>
                                        <p className="text-sm text-zinc-500 mt-1">
                                            PNG, JPG até 10MB
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
                                        className={`p-4 rounded-xl border-2 transition-all ${scale === option.id
                                            ? "border-green-500 bg-green-500/10"
                                            : "border-zinc-700 hover:border-zinc-600"
                                            }`}
                                    >
                                        <p className="text-2xl font-bold text-white">{option.label}</p>
                                        <p className="text-xs text-zinc-400">{option.description}</p>
                                        <p className="text-sm text-yellow-400 font-semibold mt-2">
                                            {option.credits} créditos
                                        </p>
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
                            onClick={handleUpscale}
                            disabled={isProcessing || !image}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3
                                ${isProcessing || !image
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20"
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
                                    <ImagePlus className="w-5 h-5" />
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
                                    <img
                                        key={result.id}
                                        src={result.resultUrl}
                                        alt="Upscaled"
                                        className="w-full h-auto"
                                        onError={(e) => {
                                            console.error("Erro ao carregar imagem:", result.resultUrl)
                                            e.currentTarget.src = result.resultUrl + "?retry=" + Date.now()
                                        }}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download HD
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
                                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Coins className="w-6 h-6 text-yellow-500" />
                                        <span className="font-semibold text-white">Seus Créditos</span>
                                    </div>
                                    <p className="text-3xl font-bold text-white mb-3">
                                        {credits ?? 0}
                                    </p>
                                    <button
                                        onClick={() => setIsPricingOpen(true)}
                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 py-2 rounded-lg font-semibold text-sm transition-colors"
                                    >
                                        Comprar Mais
                                    </button>
                                </div>

                                {/* How it works */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">Como funciona</h3>
                                    <ul className="text-sm text-zinc-400 space-y-2">
                                        <li>1. Envie sua imagem</li>
                                        <li>2. Escolha a escala (2x ou 4x)</li>
                                        <li>3. Nossa IA aumenta a resolução</li>
                                        <li>4. Baixe a imagem em alta qualidade</li>
                                    </ul>
                                </div>

                                {/* Tips */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">💡 Dicas</h3>
                                    <ul className="text-sm text-zinc-400 space-y-2">
                                        <li>• Funciona melhor com fotos e ilustrações</li>
                                        <li>• Evite imagens muito pequenas (&lt;100px)</li>
                                        <li>• 4x é ideal para impressões</li>
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


        </div>
    )
}
