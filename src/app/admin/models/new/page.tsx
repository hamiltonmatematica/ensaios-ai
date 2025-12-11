
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, Loader2, Save } from "lucide-react"

// Tipos básicos para Tag e Modelo
interface Tag {
    id: string
    name: string
    color: string
}

export default function NewModelPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [tags, setTags] = useState<Tag[]>([])

    // Form State
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [promptTemplate, setPromptTemplate] = useState("")
    const [category, setCategory] = useState("geral")
    const [creditsRequired, setCreditsRequired] = useState(1)
    const [isPremium, setIsPremium] = useState(false)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

    // Carregar tags disponíveis
    useEffect(() => {
        async function fetchTags() {
            try {
                const res = await fetch("/api/admin/tags")
                const data = await res.json()
                setTags(data.tags || [])
            } catch (error) {
                console.error("Erro ao carregar tags", error)
            }
        }
        fetchTags()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setThumbnailFile(file)
            // Preview
            const reader = new FileReader()
            reader.onload = (ev) => {
                setThumbnailPreview(ev.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Conversão da imagem para Base64 (solução temporária sem S3)
            let finalThumbnailUrl = ""
            if (thumbnailFile) {
                finalThumbnailUrl = await new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(thumbnailFile)
                })
            }

            const res = await fetch("/api/admin/models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    promptTemplate,
                    category,
                    creditsRequired: Number(creditsRequired),
                    isPremium,
                    tagIds: selectedTags, // Array de IDs
                    thumbnailUrl: finalThumbnailUrl // Enviando base64 direto
                })
            })

            if (!res.ok) throw new Error("Erro ao criar modelo")

            router.push("/admin/models")
            router.refresh()

        } catch (error) {
            console.error(error)
            alert("Erro ao salvar modelo")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold">Novo Modelo de Ensaio</h1>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">

                    {/* Upload de Foto */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-zinc-400">Foto de Capa (Thumbnail)</label>
                        <div className="flex items-center gap-6">
                            <div className="w-32 h-32 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 relative flex items-center justify-center group">
                                {thumbnailPreview ? (
                                    <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Upload className="w-8 h-8 text-zinc-600" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="text-sm text-zinc-500">
                                <p>Clique na imagem para enviar.</p>
                                <p>Recomendado: 512x512px (Quadrado)</p>
                            </div>
                        </div>
                    </div>

                    {/* Informações Básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Nome do Modelo</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                placeholder="Ex: Executivo Moderno"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none appearance-none"
                            >
                                <option value="geral">Geral</option>
                                <option value="profissional">Profissional</option>
                                <option value="artistico">Artístico</option>
                                <option value="casual">Casual</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Descrição Curta</label>
                        <input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                            placeholder="Ex: Ideal para LinkedIn e perfis corporativos."
                        />
                    </div>

                    {/* Prompt Template */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400 flex items-center justify-between">
                            Prompt Template
                            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">Segredo da IA</span>
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={promptTemplate}
                            onChange={e => setPromptTemplate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-mono text-sm"
                            placeholder="Prompt instructions for the AI... (English recommended)"
                        />
                        <p className="text-xs text-zinc-500">Descreva o estilo, iluminação, roupas e cenário. A IA usará isso como base.</p>
                    </div>

                    {/* Tags e Filtros */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-400">Tags de Filtro</label>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedTags(prev =>
                                            prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                                        )
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedTags.includes(tag.id)
                                        ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    {tag.name}
                                </button>
                            ))}

                            {/* Botão de adicionar nova tag seria ideal aqui, mas por simplicidade vamos assumir que tags são gerenciadas separadamente ou adicionaremos depois */}
                        </div>
                    </div>

                    {/* Configurações de Cobrança */}
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-300">Modelo Premium?</label>
                            <div
                                onClick={() => setIsPremium(!isPremium)}
                                className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${isPremium ? 'bg-purple-600' : 'bg-zinc-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isPremium ? 'left-7' : 'left-1'}`} />
                            </div>
                        </div>

                        {isPremium && (
                            <div className="pt-2 border-t border-zinc-800">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">Créditos Necessários</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1" max="10"
                                        value={creditsRequired}
                                        onChange={e => setCreditsRequired(Number(e.target.value))}
                                        className="flex-1 accent-purple-500"
                                    />
                                    <span className="text-xl font-bold w-8 text-center">{creditsRequired}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-yellow-500 hover:bg-yellow-400 text-zinc-900 px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Salvar Modelo
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
