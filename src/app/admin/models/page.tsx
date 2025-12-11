"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Loader2, Edit, X, Check, Image as ImageIcon } from "lucide-react"

interface Tag {
    id: string
    name: string
    slug: string
    color: string
}

interface PhotoModel {
    id: string
    name: string
    description: string
    thumbnailUrl: string
    promptTemplate: string
    isPremium: boolean
    creditsRequired: number
    isActive: boolean
    displayOrder: number
    tags: Tag[]
    _count: { generations: number }
}

export default function ModelsPage() {
    const router = useRouter()
    const [models, setModels] = useState<PhotoModel[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [form, setForm] = useState({
        name: "",
        description: "",
        thumbnailUrl: "",
        promptTemplate: "",
        tagIds: [] as string[],
        isFree: false,
        creditsRequired: 1,
        isActive: true,
        displayOrder: 0
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [modelsRes, tagsRes] = await Promise.all([
                fetch("/api/admin/models"),
                fetch("/api/admin/tags")
            ])
            const modelsData = await modelsRes.json()
            const tagsData = await tagsRes.json()
            setModels(modelsData.models || [])
            setTags(tagsData.tags || [])
        } catch (error) {
            console.error("Erro ao carregar dados:", error)
        } finally {
            setLoading(false)
        }
    }

    function resetForm() {
        setForm({
            name: "",
            description: "",
            thumbnailUrl: "",
            promptTemplate: "",
            tagIds: [],
            isFree: false,
            creditsRequired: 1,
            isActive: true,
            displayOrder: models.length
        })
        setEditingId(null)
    }

    function openNewForm() {
        resetForm()
        setShowForm(true)
    }

    function openEditForm(model: PhotoModel) {
        setForm({
            name: model.name,
            description: model.description,
            thumbnailUrl: model.thumbnailUrl,
            promptTemplate: model.promptTemplate,
            tagIds: model.tags.map(t => t.id),
            isFree: model.creditsRequired === 0,
            creditsRequired: model.creditsRequired || 1,
            isActive: model.isActive,
            displayOrder: model.displayOrder
        })
        setEditingId(model.id)
        setShowForm(true)
    }

    async function saveModel() {
        if (!form.name || !form.thumbnailUrl || !form.promptTemplate) {
            alert("Preencha nome, foto e prompt")
            return
        }

        setSaving(true)
        try {
            const url = "/api/admin/models"
            const method = editingId ? "PUT" : "POST"
            const body = editingId ? { ...form, id: editingId } : form

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                setShowForm(false)
                resetForm()
                loadData()
            } else {
                const error = await res.json()
                alert(error.error || "Erro ao salvar")
            }
        } catch (error) {
            console.error("Erro ao salvar:", error)
        } finally {
            setSaving(false)
        }
    }

    async function deleteModel(id: string) {
        if (!confirm("Tem certeza que deseja excluir este modelo?")) return

        try {
            await fetch(`/api/admin/models?id=${id}`, { method: "DELETE" })
            loadData()
        } catch (error) {
            console.error("Erro ao deletar:", error)
        }
    }

    function toggleTag(tagId: string) {
        setForm(prev => ({
            ...prev,
            tagIds: prev.tagIds.includes(tagId)
                ? prev.tagIds.filter(id => id !== tagId)
                : [...prev.tagIds, tagId]
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Modelos de Ensaio</h1>
                <button
                    onClick={() => router.push("/admin/models/new")}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Novo Modelo
                </button>
            </div>

            {/* Modal de formulário */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingId ? "Editar Modelo" : "Novo Modelo"}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Nome do Modelo *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Ensaio Empresarial"
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                                />
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Breve descrição do estilo"
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                                />
                            </div>

                            {/* Thumbnail URL */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    URL da Foto Modelo *
                                </label>
                                <input
                                    type="url"
                                    value={form.thumbnailUrl}
                                    onChange={(e) => setForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                                    placeholder="https://exemplo.com/foto.jpg"
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                                />
                                {form.thumbnailUrl && (
                                    <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden bg-zinc-800">
                                        <img src={form.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Prompt Template *
                                </label>
                                <textarea
                                    value={form.promptTemplate}
                                    onChange={(e) => setForm(prev => ({ ...prev, promptTemplate: e.target.value }))}
                                    placeholder="Descreva o estilo do ensaio que será gerado..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500 resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Tags
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.length === 0 ? (
                                        <p className="text-zinc-500 text-sm">Nenhuma tag criada. Crie tags primeiro.</p>
                                    ) : (
                                        tags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleTag(tag.id)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${form.tagIds.includes(tag.id)
                                                    ? "ring-2 ring-white"
                                                    : "opacity-50"
                                                    }`}
                                                style={{ backgroundColor: tag.color }}
                                            >
                                                {tag.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Gratuito / Créditos */}
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isFree}
                                        onChange={(e) => setForm(prev => ({ ...prev, isFree: e.target.checked }))}
                                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-yellow-500 focus:ring-yellow-500"
                                    />
                                    <span className="text-zinc-300">Modelo Gratuito (sem créditos)</span>
                                </label>

                                {!form.isFree && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-zinc-400 text-sm">Créditos:</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={form.creditsRequired}
                                            onChange={(e) => setForm(prev => ({ ...prev, creditsRequired: parseInt(e.target.value) || 1 }))}
                                            className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Ativo */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-yellow-500 focus:ring-yellow-500"
                                />
                                <span className="text-zinc-300">Modelo Ativo (visível para usuários)</span>
                            </label>
                        </div>

                        <div className="p-6 border-t border-zinc-800 flex justify-end gap-4">
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveModel}
                                disabled={saving}
                                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {editingId ? "Salvar Alterações" : "Criar Modelo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de modelos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.length === 0 ? (
                    <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                        <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500">Nenhum modelo criado ainda.</p>
                        <button
                            onClick={() => router.push("/admin/models/new")}
                            className="mt-4 px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg"
                        >
                            Criar primeiro modelo
                        </button>
                    </div>
                ) : (
                    models.map((model) => (
                        <div
                            key={model.id}
                            className={`bg-zinc-900 border rounded-xl overflow-hidden ${model.isActive ? "border-zinc-800" : "border-red-500/30 opacity-60"
                                }`}
                        >
                            <div className="aspect-[4/3] relative bg-zinc-800">
                                <img
                                    src={model.thumbnailUrl}
                                    alt={model.name}
                                    className="w-full h-full object-cover"
                                />
                                {!model.isActive && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                                        Inativo
                                    </div>
                                )}
                                {model.creditsRequired === 0 && (
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                                        Grátis
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="font-semibold text-white mb-2">{model.name}</h3>

                                {model.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {model.tags.map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="px-2 py-0.5 rounded-full text-xs text-white"
                                                style={{ backgroundColor: tag.color }}
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-sm text-zinc-500">
                                    <span>
                                        {model.creditsRequired === 0
                                            ? "Gratuito"
                                            : `${model.creditsRequired} crédito${model.creditsRequired > 1 ? "s" : ""}`
                                        }
                                    </span>
                                    <span>{model._count.generations} gerações</span>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => openEditForm(model)}
                                        className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => deleteModel(model.id)}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
