"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { Loader2, Image as ImageIcon, Download, ArrowLeft, Sparkles, Star, Zap } from "lucide-react"
import Header from "@/components/Header"
import UploadSection from "@/components/UploadSection"
import AspectRatioSelector from "@/components/AspectRatioSelector"
import ModelGallery from "@/components/ModelGallery"
import PricingModal from "@/components/PricingModal"
import { PhotoModel, GeneratedImage } from "@/types"
import { fileToBase64 } from "@/lib/nanoBanana"

// Contextos disponíveis
const CONTEXTS = [
    { id: "professional", label: "LinkedIn / Profissional", emoji: "💼", prompt: "professional headshot, business attire, corporate background" },
    { id: "instagram", label: "Instagram", emoji: "📸", prompt: "instagram style, vibrant colors, trendy aesthetic" },
    { id: "portfolio", label: "Portfolio Criativo", emoji: "🎨", prompt: "artistic portrait, creative lighting, portfolio quality" },
    { id: "dating", label: "Dating / Tinder", emoji: "💖", prompt: "attractive portrait, natural smile, warm lighting" },
    { id: "casual", label: "Casual", emoji: "😊", prompt: "casual portrait, relaxed pose, natural lighting" },
]

// Tiers de qualidade
const QUALITY_TIERS = [
    {
        id: "standard",
        name: "Standard",
        credits: 2,
        description: "Qualidade padrão",
        features: ["1 imagem gerada", "Resolução 512px"],
        icon: Star,
        color: "zinc"
    },
    {
        id: "enhanced",
        name: "Enhanced",
        credits: 6,
        description: "Com upscale 2x",
        features: ["1 imagem gerada", "Upscale 2x HD", "1024px resolução"],
        icon: Sparkles,
        color: "blue",
        recommended: true
    },
    {
        id: "premium",
        name: "Premium",
        credits: 10,
        description: "Qualidade máxima",
        features: ["1 imagem gerada", "Upscale 4K", "Inpaint refinado", "Melhor qualidade"],
        icon: Zap,
        color: "yellow"
    },
]

export default function EnsaioPage() {
    const { user, loading, credits, refreshCredits } = useAuth("/login")
    const router = useRouter()

    // State
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
    // CHANGED: Support multiple selected models
    const [selectedModels, setSelectedModels] = useState<PhotoModel[]>([])
    const [selectedRatioId, setSelectedRatioId] = useState<string>("3:4")
    const [selectedContext, setSelectedContext] = useState("professional")
    const [selectedTier, setSelectedTier] = useState("enhanced")
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState<string | null>(null) // Progress text
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
    const [error, setError] = useState<string | null>(null)

    const currentTier = QUALITY_TIERS.find(t => t.id === selectedTier) || QUALITY_TIERS[1]
    const totalCredits = currentTier.credits

    const handleGenerate = async () => {
        setError(null)

        if (!user) {
            router.push("/login")
            return
        }

        if (uploadedFiles.length < 3) {
            setError("Você precisa enviar pelo menos 3 fotos para começarmos.")
            return
        }

        if (selectedModels.length === 0) {
            setError("Selecione pelo menos um modelo para o seu ensaio.")
            return
        }

        const requiredCredits = totalCredits * selectedModels.length
        if ((credits ?? 0) < requiredCredits) {
            setIsPricingOpen(true)
            return
        }

        setIsGenerating(true)

        try {
            // Prepare reference images once
            const referenceImages = await Promise.all(
                uploadedFiles.map(file => fileToBase64(file))
            )
            const contextPrompt = CONTEXTS.find(c => c.id === selectedContext)?.prompt || ""

            // Process queue sequentially
            for (let i = 0; i < selectedModels.length; i++) {
                const model = selectedModels[i]
                setProgress(`Gerando ${i + 1} de ${selectedModels.length}...`)

                const res = await fetch("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        modelId: model.id,
                        aspectRatio: selectedRatioId,
                        referenceImages,
                        context: selectedContext,
                        contextPrompt,
                        tier: selectedTier,
                    }),
                })

                const data = await res.json()

                if (!res.ok) {
                    throw new Error(data.error || `Erro ao gerar modelo ${model.name}`)
                }

                const newImage: GeneratedImage = {
                    id: data.generationId,
                    url: data.imageUrl,
                    modelId: model.id,
                    modelName: model.name,
                    aspectRatio: selectedRatioId,
                    createdAt: new Date(),
                }

                // Add to gallery immediately after generation
                setGeneratedImages(prev => [newImage, ...prev])

                // Refresh credits after each generation
                await refreshCredits()
            }

            // Scroll to gallery
            setTimeout(() => {
                const galleryElement = document.getElementById("results-gallery")
                if (galleryElement) galleryElement.scrollIntoView({ behavior: "smooth" })
            }, 100)

            // Clear selection after success? Maybe keep it for convenience.
            // setSelectedModels([]) 

        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Erro ao gerar imagem. Tente novamente."
            setError(errorMessage)
        } finally {
            setIsGenerating(false)
            setProgress(null)
        }
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
                onOpenLogin={() => router.push('/login')}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                </button>

                {/* Intro */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        Estúdio de IA
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Transforme suas selfies em ensaios profissionais.
                        Envie 3 fotos, escolha um estilo e a IA faz o resto.
                    </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
                    {/* Left Column */}
                    <div className="space-y-8">
                        {/* Upload */}
                        <UploadSection
                            files={uploadedFiles}
                            onFilesChange={setUploadedFiles}
                        />

                        {/* Context Selector */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-300">
                                📍 Contexto / Finalidade
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {CONTEXTS.map((ctx) => (
                                    <button
                                        key={ctx.id}
                                        onClick={() => setSelectedContext(ctx.id)}
                                        className={`p-3 rounded-xl border-2 transition-all text-center ${selectedContext === ctx.id
                                            ? "border-yellow-500 bg-yellow-500/10"
                                            : "border-zinc-700 hover:border-zinc-600"
                                            }`}
                                    >
                                        <span className="text-xl">{ctx.emoji}</span>
                                        <p className="text-xs mt-1 text-zinc-300">{ctx.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Aspect Ratio */}
                        <AspectRatioSelector
                            selectedRatioId={selectedRatioId}
                            onSelectRatio={setSelectedRatioId}
                        />

                        {/* Quality Tier Selector */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-300">
                                ⭐ Qualidade
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {QUALITY_TIERS.map((tier) => {
                                    const Icon = tier.icon
                                    const isSelected = selectedTier === tier.id
                                    return (
                                        <button
                                            key={tier.id}
                                            onClick={() => setSelectedTier(tier.id)}
                                            className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${isSelected
                                                ? tier.color === "yellow"
                                                    ? "border-yellow-400 bg-yellow-500/20 scale-105 shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-400/50"
                                                    : tier.color === "blue"
                                                        ? "border-blue-400 bg-blue-500/20 scale-105 shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50"
                                                        : "border-zinc-400 bg-zinc-500/20 scale-105 shadow-lg shadow-zinc-500/30 ring-2 ring-zinc-400/50"
                                                : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50"
                                                }`}
                                        >
                                            {tier.recommended && (
                                                <span className="absolute -top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    RECOMENDADO
                                                </span>
                                            )}
                                            <Icon className={`w-6 h-6 mx-auto mb-2 transition-transform ${isSelected ? "scale-110" : ""} ${tier.color === "yellow" ? "text-yellow-400"
                                                : tier.color === "blue" ? "text-blue-400"
                                                    : "text-zinc-400"
                                                }`} />
                                            <p className={`font-bold ${isSelected ? "text-white" : "text-zinc-200"}`}>{tier.name}</p>
                                            <p className="text-xs text-zinc-400 mb-2">{tier.description}</p>
                                            <p className={`text-lg font-bold ${tier.color === "yellow" ? "text-yellow-400"
                                                : tier.color === "blue" ? "text-blue-400"
                                                    : "text-zinc-300"
                                                }`}>
                                                {tier.credits} créditos
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Model Gallery */}
                        <ModelGallery
                            // We now use selectedModelIds for multi-selection
                            selectedModelIds={selectedModels.map(m => m.id)}
                            onToggleModel={(model: PhotoModel) => {
                                setSelectedModels(prev => {
                                    const exists = prev.find(m => m.id === model.id)
                                    if (exists) {
                                        return prev.filter(m => m.id !== model.id)
                                    } else {
                                        return [...prev, model]
                                    }
                                })
                            }}
                        />

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Generate Button */}
                        <div className="sticky bottom-6 z-40 bg-zinc-900/95 backdrop-blur-lg border border-zinc-800 p-4 rounded-2xl shadow-2xl">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-zinc-400">
                                    <p>Selecionado: <span className="text-white font-medium">{selectedModels.length} modelo(s)</span></p>
                                    <p>Custo Total: <span className="text-yellow-400 font-bold">{totalCredits * selectedModels.length} créditos</span> | Saldo: {credits ?? 0}</p>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || selectedModels.length === 0}
                                    className={`
                                        w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-zinc-900 transition-all flex items-center justify-center gap-2
                                        ${isGenerating || selectedModels.length === 0
                                            ? 'bg-zinc-700 cursor-wait text-zinc-400'
                                            : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:brightness-110 shadow-lg shadow-yellow-500/20'
                                        }
                                    `}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {progress ? progress : "Gerando..."}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Gerar {selectedModels.length > 1 ? `(${selectedModels.length})` : "Ensaio"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Results */}
                    <div className="xl:border-l xl:border-zinc-800 xl:pl-8">
                        <h2 id="results-gallery" className="text-xl font-semibold text-white mb-6">
                            Seus Ensaios
                        </h2>

                        {generatedImages.length === 0 ? (
                            <div className="min-h-[400px] border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600 p-8 text-center bg-zinc-900/30">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                                <p>As fotos geradas aparecerão aqui.</p>
                                <p className="text-xs mt-2 opacity-50">Escolha um estilo e clique em Gerar.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {generatedImages.map((img) => (
                                    <div key={img.id} className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-xl">
                                        <div className="rounded-xl overflow-hidden bg-black mb-3">
                                            <img src={img.url} alt="Generated result" className="w-full h-auto object-contain max-h-[500px]" />
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <div>
                                                <span className="text-xs text-zinc-500">{img.modelName}</span>
                                                <span className="text-[10px] text-zinc-600 block">
                                                    {img.aspectRatio} • {img.createdAt.toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <a
                                                href={img.url}
                                                download={`ensaio-${img.id}.png`}
                                                className="text-yellow-500 hover:text-yellow-400 text-xs font-bold uppercase flex items-center gap-1"
                                            >
                                                <Download className="w-3 h-3" />
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
