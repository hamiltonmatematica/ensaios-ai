"use client"

import { useState, useEffect } from "react"
import {
    Image as ImageIcon,
    Sparkles,
    Wand2,
    Eraser,
    Shirt,
    Calendar,
    Download,
    ExternalLink,
    Trash2
} from "lucide-react"

type HistoryItem = {
    id: string
    type: string
    originalUrl: string | null
    resultUrl: string | null
    status: string
    createdAt: string
    details: string
}

const TABS = [
    { id: "generations", label: "Ensaio de IA", icon: Wand2 },
    { id: "face-swap", label: "Face Swap", icon: Sparkles },
    { id: "upscale", label: "Upscale", icon: ImageIcon },
]

export default function HistorySection() {
    const [activeTab, setActiveTab] = useState("generations")
    const [items, setItems] = useState<HistoryItem[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchHistory()
    }, [activeTab])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/user/history?type=${activeTab}`)
            const data = await res.json()
            if (data.items) {
                setItems(data.items)
            }
        } catch (error) {
            console.error("Failed to fetch history", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        if (!confirm("Tem certeza que deseja apagar este item do histórico?")) return

        try {
            const res = await fetch(`/api/user/history?id=${id}&type=${activeTab}`, {
                method: "DELETE"
            })
            if (res.ok) {
                setItems(prev => prev.filter(item => item.id !== id))
            }
        } catch (error) {
            console.error("Error deleting item:", error)
        }
    }

    return (
        <div className="w-full mt-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
                <h2 className="text-xl font-semibold text-white mb-4">Histórico de Criações</h2>

                {/* Tabs */}
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                    {TABS.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                                    ${isActive
                                        ? "bg-yellow-500 text-zinc-900 shadow-lg shadow-yellow-500/20"
                                        : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                    }
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 min-h-[300px]">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                        <p>Nenhuma criação encontrada nesta categoria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                            <div key={item.id} className="group relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                                <div className="aspect-square relative">
                                    {item.resultUrl ? (
                                        <img
                                            src={item.resultUrl}
                                            alt={item.details}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                                            {item.status === "processing" || item.status === "pending" ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                                    Processando...
                                                </span>
                                            ) : (
                                                <span>Falhou</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Overlay Actions */}
                                    {item.resultUrl && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <a
                                                href={item.resultUrl}
                                                download={`creation-${item.id}.png`}
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Baixar"
                                            >
                                                <Download className="w-5 h-5" />
                                            </a>
                                            <a
                                                href={item.resultUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                                                title="Abrir"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </a>
                                            <button
                                                onClick={(e) => handleDelete(e, item.id)}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 backdrop-blur-sm transition-colors"
                                                title="Apagar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-zinc-500">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.status === 'completed' || item.status === 'COMPLETED'
                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                            : item.status === 'failed' || item.status === 'FAILED'
                                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-300 truncate" title={item.details}>
                                        {item.details}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
