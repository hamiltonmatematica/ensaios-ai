"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Upload, Sparkles, Loader2, Download, ArrowLeft } from "lucide-react"
import Header from "@/components/Header"
import { ART_STYLES, type ArtStyle } from "@/lib/art-styles"

export default function ArtEffectsPage() {
    const { data: session } = useSession()
    const router = useRouter()

    const [uploadedImage, setUploadedImage] = useState<string | null>(null)
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState("")
    const [result, setResult] = useState<{ id: string; resultUrl: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleImageUpload = useCallback((file: File) => {
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
            setUploadedImage(e.target?.result as string)
            setError(null)
            setResult(null)
        }
        reader.readAsDataURL(file)
    }, [])

    const handleProcess = async () => {
        if (!uploadedImage || !selectedStyle) {
            setError("Selecione uma foto e um estilo")
            return
        }

        if (!session?.user) {
            router.push("/")
            return
        }

        setIsProcessing(true)
        setProcessingStatus("Aplicando efeito artístico...")
        setError(null)

        try {
            const res = await fetch("/api/art-effects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: uploadedImage,
                    styleId: selectedStyle,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao processar")
            }

            const jobId = data.jobId

            // Polling para status
            setProcessingStatus("Processando com IA...")
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/art-effects/status/${jobId}`)
                    const statusData = await statusRes.json()

                    if (statusData.status === "COMPLETED" || statusData.status === "completed") {
                        clearInterval(pollInterval)
                        setResult({
                            id: jobId,
                            resultUrl: statusData.resultUrl,
                        })
                        setProcessingStatus("")
                        setIsProcessing(false)
                    } else if (statusData.status === "FAILED" || statusData.status === "failed") {
                        clearInterval(pollInterval)
                        setError(statusData.error || "Erro ao processar. Tente novamente.")
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
                    setError("Tempo limite excedido (5 min). Tente novamente.")
                    setIsProcessing(false)
                    setProcessingStatus("")
                }
            }, 300000) // 5 min

        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Erro ao processar"
            setError(errorMessage)
            setIsProcessing(false)
            setProcessingStatus("")
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col">
            <Header onOpenPricing={() => { }} onOpenLogin={() => { }} />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">🎨 Efeitos Artísticos</h1>
                    <p className="text-zinc-400">
                        Transforme suas fotos com estilos artísticos incríveis
                    </p>
                    <p className="text-sm text-yellow-500 mt-2">
                        💰 35 créditos (25 estilo + 10 upscale)
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Upload & Styles */}
                    <div className="space-y-6">
                        {/* Upload */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h2 className="text-xl font-semibold text-white mb-4">
                                1. Envie sua Foto
                            </h2>
                            <div
                                className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer"
                                onClick={() => document.getElementById("image-upload")?.click()}
                            >
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                                />
                                {uploadedImage ? (
                                    <img
                                        src={uploadedImage}
                                        alt="Preview"
                                        className="max-h-64 mx-auto rounded-lg"
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <Upload className="w-12 h-12 text-zinc-600 mx-auto" />
                                        <p className="text-zinc-400">Clique para enviar uma imagem</p>
                                        <p className="text-sm text-zinc-600">Máximo 10MB</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Styles Selection */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h2 className="text-xl font-semibold text-white mb-4">
                                2. Escolha o Estilo
                            </h2>
                            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {ART_STYLES.map((style) => (
                                    <button
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style.id)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${selectedStyle === style.id
                                                ? "border-blue-500 bg-blue-500/10"
                                                : "border-zinc-700 hover:border-zinc-600"
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{style.icon}</div>
                                        <div className="font-semibold text-white text-sm">
                                            {style.name}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1">
                                            {style.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Process Button */}
                        <button
                            onClick={handleProcess}
                            disabled={!uploadedImage || !selectedStyle || isProcessing}
                            className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {processingStatus}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Criar Arte
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Right: Result */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Resultado</h2>
                        {result ? (
                            <div className="space-y-4">
                                <img
                                    src={result.resultUrl}
                                    alt="Resultado"
                                    className="w-full rounded-lg"
                                />
                                <a
                                    href={result.resultUrl}
                                    download
                                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold py-3 px-6 rounded-xl transition-all"
                                >
                                    <Download className="w-5 h-5" />
                                    Download
                                </a>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-12 text-center">
                                <Sparkles className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-600">
                                    Sua arte aparecerá aqui
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
