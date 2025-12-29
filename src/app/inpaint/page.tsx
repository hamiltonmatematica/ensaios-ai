"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    Eraser,
    Loader2,
    Download,
    ArrowLeft,
    Coins,
    AlertCircle,
    CheckCircle,
    Upload,
    Undo,
    RefreshCw
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"

const CREDITS_COST = 15

export default function InpaintPage() {
    const { data: session, status, update: updateSession } = useSession()
    const router = useRouter()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)

    // Form state
    const [image, setImage] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [prompt, setPrompt] = useState("")
    const [mask, setMask] = useState<string | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [brushSize, setBrushSize] = useState(30)

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

    const handleImageUpload = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Por favor, envie apenas imagens")
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("Imagem muito grande. Máximo 10MB")
            return
        }

        setImageFile(file)
        const reader = new FileReader()
        reader.onload = (e) => {
            setImage(e.target?.result as string)
            setError(null)
            setMask(null)
        }
        reader.readAsDataURL(file)
    }, [])

    // Inicializar canvas quando imagem carregar
    useEffect(() => {
        if (image && canvasRef.current && imageRef.current) {
            const canvas = canvasRef.current
            const img = imageRef.current

            img.onload = () => {
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext("2d")
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height)
                }
            }
        }
    }, [image])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true)
        draw(e)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        ctx.fillStyle = "rgba(255, 0, 0, 0.5)"
        ctx.beginPath()
        ctx.arc(x, y, brushSize, 0, Math.PI * 2)
        ctx.fill()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        // Salvar máscara
        if (canvasRef.current) {
            setMask(canvasRef.current.toDataURL())
        }
    }

    const clearCanvas = () => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d")
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            }
        }
        setMask(null)
    }

    const handleInpaint = async () => {
        setError(null)

        if (!session?.user) {
            setShowLoginModal(true)
            return
        }

        if (!image) {
            setError("Envie uma imagem primeiro")
            return
        }

        if (!mask) {
            setError("Marque a área que deseja editar")
            return
        }

        if ((session.user.credits ?? 0) < CREDITS_COST) {
            setIsPricingOpen(true)
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Iniciando edição...")

        try {
            const res = await fetch("/api/inpaint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image,
                    mask,
                    prompt: prompt || "remove object, clean background",
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao processar")
            }

            const jobId = data.jobId

            // Polling
            setProcessingStatus("Editando imagem com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/inpaint/status/${jobId}`)
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
                        setError(statusData.error || "Erro na edição. Tente novamente.")
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
        link.download = `inpaint-${result.id}.png`
        link.click()
    }

    const handleReset = () => {
        setResult(null)
        setMask(null)
        clearCanvas()
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
                        Inpaint / Remover Objetos
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Marque a área que deseja remover ou editar e a IA fará o resto.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Editor */}
                    <div className="space-y-6">
                        {!image ? (
                            <div
                                className="relative border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-2xl p-12 text-center transition-all"
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isProcessing}
                                />
                                <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                                <p className="text-white font-medium">Envie uma imagem para editar</p>
                                <p className="text-sm text-zinc-500 mt-1">PNG, JPG até 10MB</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative rounded-xl overflow-hidden bg-black">
                                    <img
                                        ref={imageRef}
                                        src={image}
                                        alt="Original"
                                        className="w-full h-auto"
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full cursor-crosshair"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                    />
                                </div>

                                {/* Brush Controls */}
                                <div className="flex items-center gap-4 bg-zinc-900 p-3 rounded-xl">
                                    <span className="text-sm text-zinc-400">Pincel:</span>
                                    <input
                                        type="range"
                                        min="10"
                                        max="80"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="flex-1 accent-pink-500"
                                    />
                                    <span className="text-sm text-white w-8">{brushSize}px</span>
                                    <button
                                        onClick={clearCanvas}
                                        className="flex items-center gap-1 text-zinc-400 hover:text-white text-sm"
                                    >
                                        <Undo className="w-4 h-4" />
                                        Limpar
                                    </button>
                                </div>

                                {/* Prompt */}
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400">
                                        O que colocar no lugar? (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Ex: fundo limpo, parede branca..."
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:border-pink-500 focus:outline-none"
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
                            onClick={handleInpaint}
                            disabled={isProcessing || !image || !mask}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3
                                ${isProcessing || !image || !mask
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-lg shadow-pink-500/20"
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
                                    <Eraser className="w-5 h-5" />
                                    Aplicar Edição ({CREDITS_COST} créditos)
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
                                    Edição Concluída!
                                </h3>
                                <div className="rounded-xl overflow-hidden bg-black">
                                    <img
                                        src={result.resultUrl}
                                        alt="Resultado"
                                        className="w-full h-auto"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-400 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Nova Edição
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Credits Card */}
                                <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-2xl p-5">
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
                                    <h3 className="font-semibold text-white mb-3">🎨 Como usar</h3>
                                    <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                                        <li>Envie uma imagem</li>
                                        <li>Marque a área em vermelho</li>
                                        <li>(Opcional) Descreva o que colocar</li>
                                        <li>Clique em Aplicar Edição</li>
                                    </ol>
                                </div>

                                {/* Tips */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                    <h3 className="font-semibold text-white mb-3">💡 Dicas</h3>
                                    <ul className="text-sm text-zinc-400 space-y-2">
                                        <li>• Marque um pouco além do objeto</li>
                                        <li>• Funciona melhor com fundos simples</li>
                                        <li>• Use prompts específicos para melhores resultados</li>
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
