"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"

interface Tag {
    id: string
    name: string
    slug: string
    color: string
    _count: { photoModels: number }
}

const COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
    "#ec4899", "#f43f5e"
]

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [newTagName, setNewTagName] = useState("")
    const [newTagColor, setNewTagColor] = useState(COLORS[0])

    useEffect(() => {
        loadTags()
    }, [])

    async function loadTags() {
        try {
            const res = await fetch("/api/admin/tags")
            const data = await res.json()
            setTags(data.tags || [])
        } catch (error) {
            console.error("Erro ao carregar tags:", error)
        } finally {
            setLoading(false)
        }
    }

    async function createTag() {
        if (!newTagName.trim()) return

        setSaving(true)
        try {
            const res = await fetch("/api/admin/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTagName, color: newTagColor })
            })

            if (res.ok) {
                setNewTagName("")
                loadTags()
            }
        } catch (error) {
            console.error("Erro ao criar tag:", error)
        } finally {
            setSaving(false)
        }
    }

    async function deleteTag(id: string) {
        if (!confirm("Tem certeza que deseja excluir esta tag?")) return

        try {
            await fetch(`/api/admin/tags?id=${id}`, { method: "DELETE" })
            loadTags()
        } catch (error) {
            console.error("Erro ao deletar tag:", error)
        }
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
            <h1 className="text-3xl font-bold text-white mb-8">Tags</h1>

            {/* Formulário para nova tag */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Nova Tag</h2>
                <div className="flex flex-wrap gap-4">
                    <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Nome da tag (ex: Homem, Mulher, Escritório)"
                        className="flex-1 min-w-[200px] px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                        onKeyDown={(e) => e.key === "Enter" && createTag()}
                    />

                    <div className="flex gap-2 items-center">
                        <span className="text-zinc-400 text-sm">Cor:</span>
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => setNewTagColor(color)}
                                className={`w-8 h-8 rounded-full transition-transform ${newTagColor === color ? "scale-125 ring-2 ring-white" : ""
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={createTag}
                        disabled={saving || !newTagName.trim()}
                        className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Criar Tag
                    </button>
                </div>
            </div>

            {/* Lista de tags */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-zinc-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Tag</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Slug</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-300">Modelos</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-300">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {tags.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                    Nenhuma tag criada ainda. Crie sua primeira tag acima!
                                </td>
                            </tr>
                        ) : (
                            tags.map((tag) => (
                                <tr key={tag.id} className="hover:bg-zinc-800/50">
                                    <td className="px-6 py-4">
                                        <span
                                            className="px-3 py-1 rounded-full text-sm font-medium text-white"
                                            style={{ backgroundColor: tag.color }}
                                        >
                                            {tag.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 font-mono text-sm">
                                        {tag.slug}
                                    </td>
                                    <td className="px-6 py-4 text-center text-zinc-300">
                                        {tag._count.photoModels}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => deleteTag(tag.id)}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
