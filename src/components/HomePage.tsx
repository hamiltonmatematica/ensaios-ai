"use client"

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { Loader2, Image as ImageIcon, Download } from "lucide-react"
import Header from "@/components/Header"
import UploadSection from "@/components/UploadSection"
import AspectRatioSelector from "@/components/AspectRatioSelector"
import ModelGallery from "@/components/ModelGallery"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"
import { PhotoModel, GeneratedImage } from "@/types"
import { fileToBase64 } from "@/lib/nanoBanana"

export default function HomePage() {
    const { data: session, update: updateSession } = useSession()

    // State
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
    const [selectedModel, setSelectedModel] = useState<PhotoModel | null>(null)
    const [selectedRatioId, setSelectedRatioId] = useState<string>("3:4")
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
    const [error, setError] = useState<string | null>(null)
    const [showLoginModal, setShowLoginModal] = useState(false)

    // Verificar parâmetros de URL após pagamento
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get("success") === "true") {
            // Recarrega sessão para atualizar créditos
            updateSession()
            // Limpa URL
            window.history.replaceState({}, "", "/")
        }
    }, [updateSession])

    const handleGenerate = async () => {
        setError(null)

        // Validação: precisa estar logado
        if (!session?.user) {
            setShowLoginModal(true)
            return
        }

        // Validação: precisa de 3 fotos
        if (uploadedFiles.length < 3) {
            setError("Você precisa enviar pelo menos 3 fotos para começarmos.")
            return
        }

        // Validação: precisa selecionar modelo
        if (!selectedModel) {
            setError("Selecione um modelo para o seu ensaio.")
            return
        }

        // Validação: precisa ter créditos
        if ((session.user.credits ?? 0) < selectedModel.creditsRequired) {
            setIsPricingOpen(true)
            return
        }

        // Inicia geração
        setIsGenerating(true)

        try {
            // Converte arquivos para base64
            const referenceImages = await Promise.all(
                uploadedFiles.map(file => fileToBase64(file))
            )

            // Chama API
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    modelId: selectedModel.id,
                    aspectRatio: selectedRatioId,
                    referenceImages,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao gerar imagem")
            }

            // Adiciona imagem gerada à galeria
            const newImage: GeneratedImage = {
                id: data.generationId,
                url: data.imageUrl,
                modelId: selectedModel.id,
                modelName: selectedModel.name,
                aspectRatio: selectedRatioId,
                createdAt: new Date(),
            }
            setGeneratedImages(prev => [newImage, ...prev])

            // Atualiza sessão para refletir créditos atualizados
            await updateSession()

            // Scroll para resultados
            setTimeout(() => {
                const galleryElement = document.getElementById("results-gallery")
                if (galleryElement) galleryElement.scrollIntoView({ behavior: "smooth" })
            }, 100)

        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Erro ao gerar imagem. Tente novamente."
            setError(errorMessage)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => setShowLoginModal(true)}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">

                {/* Intro */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                        Estúdio de IA
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Transforme suas selfies em ensaios profissionais.
                        Envie 3 fotos, escolha um estilo e a inteligência artificial do
                        <span className="text-yellow-500 font-semibold ml-1">Ensaios.AI</span> faz o resto.
                    </p>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_350px] gap-8 lg:gap-12">
                    {/* Left Column: Controls */}
                    <div className="flex flex-col">
                        <UploadSection
                            files={uploadedFiles}
                            onFilesChange={setUploadedFiles}
                        />

                        <AspectRatioSelector
                            selectedRatioId={selectedRatioId}
                            onSelectRatio={setSelectedRatioId}
                        />

                        <ModelGallery
                            selectedModelId={selectedModel?.id || null}
                            onSelectModel={setSelectedModel}
                        />

                        {/* Generate Action Area */}
                        <div className="sticky bottom-6 z-40 bg-zinc-900/90 backdrop-blur-lg border border-zinc-800 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-zinc-400 hidden sm:block">
                                <p>Custo: <span className="text-white font-bold">{selectedModel?.creditsRequired || 1} Crédito{(selectedModel?.creditsRequired || 1) > 1 ? 's' : ''}</span></p>
                                <p>Saldo: {session?.user?.credits ?? 0}</p>
                            </div>

                            {error && (
                                <div className="text-red-400 text-xs sm:text-sm font-medium px-2">{error}</div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`
                  w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-zinc-900 transition-all
                  ${isGenerating
                                        ? 'bg-zinc-700 cursor-wait'
                                        : 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:brightness-110 shadow-lg shadow-yellow-500/20'
                                    }
                `}
                            >
                                {isGenerating ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
                                        Gerando Ensaio...
                                    </span>
                                ) : (
                                    "Gerar Ensaio"
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Preview / Results */}
                    <div className="lg:border-l lg:border-zinc-800 lg:pl-12 flex flex-col">
                        <h2 id="results-gallery" className="text-xl font-semibold text-white mb-6">Seus Ensaios</h2>

                        {generatedImages.length === 0 ? (
                            <div className="flex-1 min-h-[400px] border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600 p-8 text-center bg-zinc-900/30">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                                <p>As fotos geradas aparecerão aqui.</p>
                                <p className="text-xs mt-2 opacity-50">Escolha um estilo e clique em Gerar.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {generatedImages.map((img) => (
                                    <div key={img.id} className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-xl animate-[fadeIn_0.5s_ease-out]">
                                        <div className="rounded-xl overflow-hidden bg-black mb-3">
                                            <img src={img.url} alt="Generated result" className="w-full h-auto object-contain max-h-[500px]" />
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-zinc-500">
                                                    {img.modelName}
                                                </span>
                                                <span className="text-[10px] text-zinc-600">
                                                    Formato: {img.aspectRatio} • {img.createdAt.toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <a
                                                href={img.url}
                                                download={`ensaio-${img.id}.png`}
                                                className="text-yellow-500 hover:text-yellow-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
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

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </div>
    )
}
