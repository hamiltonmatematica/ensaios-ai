"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import {
    Upload,
    X,
    Loader2,
    Download,
    Share2,
    RefreshCw,
    Zap,
    DollarSign,
    Cpu,
    HelpCircle,
    ArrowLeft,
    Coins,
    Clock,
    CheckCircle,
    AlertCircle
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"


interface FaceSwapResult {
    id: string
    resultImage: string
    createdAt: Date
}

export default function FaceSwapPage() {
    const { user, loading, credits, refreshCredits } = useAuth("/login")
    const router = useRouter()

    // State
    const [sourceImage, setSourceImage] = useState<string | null>(null)
    const [targetImage, setTargetImage] = useState<string | null>(null)
    const [sourceFile, setSourceFile] = useState<File | null>(null)
    const [targetFile, setTargetFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<FaceSwapResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [processingStatus, setProcessingStatus] = useState<string>("")
    const [isPricingOpen, setIsPricingOpen] = useState(false)

    const [showHowItWorks, setShowHowItWorks] = useState(false)
    const [history, setHistory] = useState<FaceSwapResult[]>([])

    const sourceInputRef = useRef<HTMLInputElement>(null)
    const targetInputRef = useRef<HTMLInputElement>(null)

    // Carrega histórico
    useEffect(() => {
        if (user) {
            fetchHistory()
        }
    }, [user])

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/face-swap/history")
            if (res.ok) {
                const data = await res.json()
                // API agora retorna array direto ou objeto com jobs (retrocompatibilidade)
                const jobs = Array.isArray(data) ? data : (data.jobs || [])
                setHistory(jobs)
            }
        } catch (e) {
            console.error("Erro ao carregar histórico:", e)
        }
    }

    const validateImage = (file: File): Promise<{ valid: boolean; error?: string }> => {
        return new Promise((resolve) => {
            // Verifica formato
            if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
                resolve({ valid: false, error: "❌ Use apenas JPG ou PNG" })
                return
            }

            // Verifica dimensões
            const img = new Image()
            img.onload = () => {
                if (img.width < 200 || img.height < 200) {
                    resolve({ valid: false, error: "❌ Imagem muito pequena (mínimo 200x200px)" })
                } else {
                    resolve({ valid: true })
                }
            }
            img.onerror = () => {
                resolve({ valid: false, error: "❌ Erro ao carregar imagem" })
            }
            img.src = URL.createObjectURL(file)
        })
    }

    const compressImage = (file: File, maxWidth: number = 1024, quality: number = 0.85): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    // Calcula novas dimensões mantendo aspect ratio
                    let width = img.width
                    let height = img.height

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width
                        width = maxWidth
                    }

                    // Cria canvas para redimensionar
                    const canvas = document.createElement('canvas')
                    canvas.width = width
                    canvas.height = height

                    const ctx = canvas.getContext('2d')
                    if (!ctx) {
                        reject(new Error('Canvas context error'))
                        return
                    }

                    ctx.drawImage(img, 0, 0, width, height)

                    // Converte para base64 comprimido
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
                    resolve(compressedBase64)
                }
                img.onerror = reject
                img.src = e.target?.result as string
            }
            reader.onerror = reject
        })
    }

    const fileToBase64 = (file: File): Promise<string> => {
        // Usa compressão para garantir que a imagem não exceda o limite
        return compressImage(file, 1024, 0.85)
    }

    const handleSourceUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        const validation = await validateImage(file)
        if (!validation.valid) {
            setError(validation.error || "Imagem inválida")
            return
        }

        const base64 = await fileToBase64(file)
        setSourceImage(base64)
        setSourceFile(file)
    }, [])

    const handleTargetUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        const validation = await validateImage(file)
        if (!validation.valid) {
            setError(validation.error || "Imagem inválida")
            return
        }

        const base64 = await fileToBase64(file)
        setTargetImage(base64)
        setTargetFile(file)
    }, [])

    const handleClear = () => {
        setSourceImage(null)
        setTargetImage(null)
        setSourceFile(null)
        setTargetFile(null)
        setResult(null)
        setError(null)
        setProcessingStatus("")
    }

    const handleProcess = async () => {
        setError(null)

        // Validações
        if (!user) {
            router.push("/login")
            return
        }

        if (!sourceImage || !targetImage) {
            setError("Envie as duas imagens para continuar")
            return
        }

        if ((credits ?? 0) < 5) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Preparando sua transformação...")

        try {
            // Chama API
            const res = await fetch("/api/face-swap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceImage,
                    targetImage,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao processar")
            }

            const jobId = data.jobId

            // Polling para status
            setProcessingStatus("Criando sua imagem com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/face-swap/status/${jobId}`)
                    const statusData = await statusRes.json()
                    console.log("[Face Swap Client] Status response:", statusData)

                    if (statusData.status === "COMPLETED") {
                        console.log("[Face Swap Client] Job completed!")
                        clearInterval(pollInterval)
                        setProcessingStatus("")
                        setIsProcessing(false)

                        // Atualizar histórico primeiro
                        await fetchHistory()

                        // Buscar o job do banco para garantir que temos os dados corretos
                        try {
                            const jobRes = await fetch(`/api/face-swap/history`)
                            const jobs = await jobRes.json()
                            const completedJob = jobs.find((j: any) => j.id === jobId)

                            if (completedJob) {
                                console.log("[Face Swap Client] Setting result from history:", completedJob)
                                setResult(completedJob)
                            } else {
                                console.log("[Face Swap Client] Job not found in history yet, using status data")
                                setResult({
                                    id: jobId,
                                    resultImage: statusData.resultImage,
                                    createdAt: new Date(),
                                })
                            }

                            // Scroll para o resultado
                            setTimeout(() => {
                                const resultElement = document.getElementById("result-section")
                                if (resultElement) {
                                    resultElement.scrollIntoView({ behavior: "smooth", block: "start" })
                                }
                            }, 100)
                        } catch (error) {
                            console.error("[Face Swap Client] Error fetching completed job:", error)
                            // Fallback em caso de erro no fetch
                            setResult({
                                id: jobId,
                                resultImage: statusData.resultImage,
                                createdAt: new Date(),
                            })
                        }

                        await refreshCredits()
                    } else if (statusData.status === "FAILED") {
                        console.log("[Face Swap Client] Job failed:", statusData.error)
                        clearInterval(pollInterval)
                        setError(statusData.error || "Erro ao processar. Tente novamente.")
                        setProcessingStatus("")
                        setIsProcessing(false)
                    } else {
                        console.log("[Face Swap Client] Still processing, status:", statusData.status)
                        setProcessingStatus("Aplicando transformação...")
                    }
                } catch (e) {
                    console.error("Erro no polling:", e)
                }
            }, 2000)

            // Timeout de 180 segundos (3 minutos)
            setTimeout(() => {
                clearInterval(pollInterval)
                if (isProcessing) {
                    setError("Tempo limite excedido. O Face Swap pode levar alguns minutos. Verifique o histórico em alguns instantes.")
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

    const handleDownload = async () => {
        if (!result?.resultImage) return

        try {
            // Se for URL do proxy, buscar a imagem
            const response = await fetch(result.resultImage)
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)

            const link = document.createElement("a")
            link.href = url
            link.download = `face-swap-${result.id}.png`
            link.click()

            // Limpar URL temporária
            setTimeout(() => URL.revokeObjectURL(url), 100)
        } catch (error) {
            console.error("Erro ao fazer download:", error)
            alert("Erro ao fazer download. Tente novamente.")
        }
    }

    const handleShare = async () => {
        if (!result?.resultImage) return

        try {
            await navigator.clipboard.writeText(result.resultImage)
            alert("Link copiado para a área de transferência!")
        } catch (e) {
            console.error("Erro ao copiar:", e)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => router.push("/login")}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                {/* Back Button */}
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                </button>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                        Face Swap IA
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto mb-4">
                        Troque rostos entre imagens de forma rápida e realista usando inteligência artificial.
                        Custo: <span className="text-yellow-400 font-semibold">5 créditos</span>
                    </p>
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 max-w-xl mx-auto text-left space-y-2">
                        <p className="text-sm text-zinc-300">
                            💡 <strong>Dica:</strong> Para melhores resultados, use uma foto de rosto bem enquadrada (selfie frontal)
                            e uma foto alvo com o rosto visível e em boa resolução.
                        </p>
                        <p className="text-xs text-zinc-400">
                            ⚡ As imagens são automaticamente comprimidas para otimizar o processamento.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Uploads */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Source Image Upload */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-300">
                                    📸 Foto com rosto para COPIAR
                                    <span className="text-xs text-zinc-500 block">Use uma selfie frontal, focada no rosto</span>
                                </label>
                                <div
                                    onClick={() => sourceInputRef.current?.click()}
                                    className={`
                                        relative min-h-[200px] rounded-2xl border-2 border-dashed cursor-pointer
                                        ${sourceImage
                                            ? "border-green-500/50 bg-green-500/5"
                                            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
                                        }
                                        transition-all flex items-center justify-center overflow-hidden
                                    `}
                                >
                                    {sourceImage ? (
                                        <>
                                            <img
                                                src={sourceImage}
                                                alt="Source"
                                                className="max-w-full max-h-[300px] object-contain"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSourceImage(null)
                                                    setSourceFile(null)
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-400 p-1.5 rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Fonte
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6">
                                            <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                                            <p className="text-sm text-zinc-400">Clique para enviar</p>
                                            <p className="text-xs text-zinc-600 mt-1">JPG ou PNG, min 200x200</p>
                                        </div>
                                    )}
                                    <input
                                        ref={sourceInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/jpg"
                                        onChange={handleSourceUpload}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Target Image Upload */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-300">
                                    🎯 Foto ALVO (onde o rosto será aplicado)
                                    <span className="text-xs text-zinc-500 block">A imagem final terá o formato desta foto</span>
                                </label>
                                <div
                                    onClick={() => targetInputRef.current?.click()}
                                    className={`
                                        relative min-h-[200px] rounded-2xl border-2 border-dashed cursor-pointer
                                        ${targetImage
                                            ? "border-blue-500/50 bg-blue-500/5"
                                            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
                                        }
                                        transition-all flex items-center justify-center overflow-hidden
                                    `}
                                >
                                    {targetImage ? (
                                        <>
                                            <img
                                                src={targetImage}
                                                alt="Target"
                                                className="max-w-full max-h-[300px] object-contain"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setTargetImage(null)
                                                    setTargetFile(null)
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-400 p-1.5 rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Alvo
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6">
                                            <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                                            <p className="text-sm text-zinc-400">Clique para enviar</p>
                                            <p className="text-xs text-zinc-600 mt-1">JPG ou PNG, min 200x200</p>
                                        </div>
                                    )}
                                    <input
                                        ref={targetInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/jpg"
                                        onChange={handleTargetUpload}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleProcess}
                                disabled={isProcessing || !sourceImage || !targetImage}
                                className={`
                                    flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                                    ${isProcessing || !sourceImage || !targetImage
                                        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20"
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
                                        <Zap className="w-5 h-5" />
                                        Processar Face Swap
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors"
                            >
                                Limpar
                            </button>
                        </div>

                        {/* Result Section */}
                        {result && (
                            <div id="result-section" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Resultado
                                </h3>
                                <div className="rounded-xl overflow-hidden bg-black">
                                    <img
                                        key={result.id}
                                        src={result.resultImage}
                                        alt="Result"
                                        className="w-full h-auto max-h-[500px] object-contain"
                                        onError={(e) => {
                                            console.error("Erro ao carregar imagem:", result.resultImage)
                                            e.currentTarget.src = result.resultImage + "?retry=" + Date.now()
                                        }}
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
                                        onClick={handleShare}
                                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Compartilhar
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Novo Face Swap
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Info */}
                    <div className="space-y-6">
                        {/* Credits Card */}
                        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-5">
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

                        {/* Tech Info Card */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                            <h3 className="font-semibold text-white">Tecnologia</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Acessível</p>
                                        <p className="text-xs text-zinc-500">5 créditos por uso</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <Cpu className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Inswapper 128</p>
                                        <p className="text-xs text-zinc-500">Alta qualidade</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHowItWorks(true)}
                                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                <HelpCircle className="w-4 h-4" />
                                Como funciona?
                            </button>
                        </div>

                        {/* History */}
                        {history.length > 0 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Histórico Recente
                                </h3>
                                <div className="space-y-3">
                                    {history.slice(0, 5).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                                            onClick={() => setResult(item)}
                                        >
                                            <img
                                                src={item.resultImage}
                                                alt="History item"
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-zinc-400">
                                                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* How It Works Modal */}
            {showHowItWorks && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHowItWorks(false)} />
                    <div className="relative bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl p-6">
                        <button
                            onClick={() => setShowHowItWorks(false)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4">Como Funciona?</h3>
                        <div className="space-y-4 text-sm text-zinc-300">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">1</div>
                                <p>Envie a <strong>foto com o rosto</strong> que você quer copiar.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">2</div>
                                <p>Envie a <strong>foto alvo</strong> onde o rosto será aplicado.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">3</div>
                                <p>Clique em <strong>Processar</strong> e aguarde alguns segundos.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">4</div>
                                <p>Faça <strong>download</strong> ou compartilhe o resultado!</p>
                            </div>
                        </div>
                        <p className="mt-6 text-xs text-zinc-500">
                            Utilizamos a tecnologia Inswapper 128 para garantir resultados realistas e de alta qualidade.
                        </p>
                    </div>
                </div>
            )}

            <PricingModal
                isOpen={isPricingOpen}
                onClose={() => setIsPricingOpen(false)}
            />


        </div>
    )
}
