"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Lock } from "lucide-react"
import { PhotoModel } from "@/types"

interface Tag {
    id: string
    name: string
    slug: string
    color: string
}

interface ModelWithTags extends PhotoModel {
    tags?: Tag[]
}

interface ModelGalleryProps {
    selectedModelId: string | null
    onSelectModel: (model: PhotoModel) => void
}

export default function ModelGallery({ selectedModelId, onSelectModel }: ModelGalleryProps) {
    const { data: session } = useSession()
    const [models, setModels] = useState<ModelWithTags[]>([])
    const [allTags, setAllTags] = useState<Tag[]>([])
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    // Usuário tem créditos = pode acessar modelos premium
    const hasCredits = (session?.user?.credits ?? 0) > 0

    useEffect(() => {
        async function fetchModels() {
            try {
                const res = await fetch("/api/models")
                const data = await res.json()
                setModels(data.models || [])
                setAllTags(data.tags || [])
            } catch (error) {
                console.error("Erro ao buscar modelos:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchModels()
    }, [])

    // Filtrar modelos por tag selecionada
    const filteredModels = selectedTags.length === 0
        ? models
        : models.filter(model =>
            model.tags?.some(tag => selectedTags.includes(tag.id))
        )

    function toggleTag(tagId: string) {
        // Lógica de "Radio Button": se clicar no já selecionado, desmarca. Se clicar em outro, troca.
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? [] // Desmarca se já estava selecionado
                : [tagId] // Marca apenas o novo
        )
    }

    if (loading) {
        return (
            <div className="w-full mb-8">
                <h2 className="text-xl font-semibold text-white mb-2">3. Escolha o Modelo de Ensaio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="aspect-square bg-zinc-800 animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">3. Escolha o Modelo de Ensaio</h2>
            <p className="text-zinc-400 text-sm mb-4">
                Selecione o estilo da sua foto. Alguns modelos requerem créditos.
            </p>

            {/* Filtro por tags */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-sm text-zinc-400 mr-2">Filtrar:</span>
                    {allTags.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTags.includes(tag.id)
                                ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-105"
                                : "opacity-60 hover:opacity-100"
                                }`}
                            style={{ backgroundColor: tag.color }}
                        >
                            {tag.name}
                        </button>
                    ))}
                    {selectedTags.length > 0 && (
                        <button
                            onClick={() => setSelectedTags([])}
                            className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full text-sm hover:bg-zinc-700 transition-colors"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {filteredModels.map((model) => {
                    const isLocked = model.isPremium && !hasCredits && model.creditsRequired > 0
                    const isSelected = selectedModelId === model.id

                    return (
                        <div
                            key={model.id}
                            onClick={() => !isLocked && onSelectModel(model)}
                            className={`
                relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200
                ${isSelected ? 'border-yellow-500 scale-[1.02] shadow-lg shadow-yellow-500/20' : 'border-transparent hover:border-zinc-700'}
                ${isLocked ? 'opacity-75 grayscale-[0.5]' : ''}
              `}
                        >
                            <div className="aspect-square bg-zinc-800 relative">
                                <img
                                    src={model.thumbnailUrl}
                                    alt={model.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
                                    <h3 className="font-bold text-white text-sm sm:text-base leading-tight">{model.name}</h3>
                                    {model.tags && model.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {model.tags.slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="text-[9px] px-1.5 py-0.5 rounded text-white/90"
                                                    style={{ backgroundColor: tag.color + '99' }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Badges */}
                                <div className="absolute top-2 right-2">
                                    {model.creditsRequired === 0 ? (
                                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            Grátis
                                        </span>
                                    ) : model.isPremium ? (
                                        <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-purple-400/30 backdrop-blur-md">
                                            Premium
                                        </span>
                                    ) : (
                                        <span className="bg-zinc-800/80 text-zinc-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-zinc-600 backdrop-blur-md">
                                            {model.creditsRequired} Crédito{model.creditsRequired > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Locked Overlay */}
                                {isLocked && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-2 backdrop-blur-[2px]">
                                        <Lock className="w-6 h-6 text-zinc-400 mb-2" />
                                        <span className="text-xs font-bold text-white">Créditos Necessários</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {filteredModels.length === 0 && !loading && (
                <div className="text-center py-12 text-zinc-500">
                    {selectedTags.length > 0
                        ? <p>Nenhum modelo encontrado para os filtros selecionados.</p>
                        : <p>Nenhum modelo disponível no momento.</p>
                    }
                </div>
            )}
        </div>
    )
}
