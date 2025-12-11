
"use client"

import { useEffect, useState } from "react"
import { MessageSquare, Mail, Phone, Clock, Loader2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface SupportMessage {
    id: string
    name: string
    email: string
    whatsapp: string
    message: string
    status: string
    createdAt: string
    user?: {
        name: string | null
        email: string | null
    }
}

export default function AdminSupportPage() {
    const router = useRouter()
    const [messages, setMessages] = useState<SupportMessage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchMessages() {
            try {
                const res = await fetch("/api/admin/support")
                if (res.ok) {
                    const data = await res.json()
                    setMessages(data)
                }
            } catch (error) {
                console.error("Erro ao carregar mensagens", error)
            } finally {
                setLoading(false)
            }
        }
        fetchMessages()
    }, [])


    async function handleUpdateStatus(id: string, newStatus: string) {
        try {
            const res = await fetch("/api/admin/support", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            })

            if (res.ok) {
                setMessages(messages.map(msg =>
                    msg.id === id ? { ...msg, status: newStatus } : msg
                ))
            } else {
                alert("Erro ao atualizar status.")
            }
        } catch (error) {
            console.error("Erro ao atualizar status:", error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push("/admin")}
                        className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Suporte</h1>
                        <p className="text-zinc-500">Caixa de entrada de mensagens dos usuários</p>
                    </div>
                </header>

                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <p className="text-zinc-500">Nenhuma mensagem de suporte ainda.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`bg-zinc-900 border ${msg.status === 'resolved' ? 'border-green-900/30 opacity-75' : 'border-zinc-800'} rounded-xl p-6 hover:border-zinc-700 transition-all`}>
                                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                            {msg.name}
                                            {msg.user && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">Usuário Registrado</span>}
                                            {msg.status === 'resolved' && <span className="text-xs bg-green-900/30 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">Resolvido</span>}
                                        </h3>
                                        <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3 h-3" />
                                                <a href={`mailto:${msg.email}`} className="hover:text-yellow-500 transition-colors">{msg.email}</a>
                                            </span>
                                            {msg.whatsapp && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    <a href={`https://wa.me/55${msg.whatsapp.replace(/\D/g, '')}`} target="_blank" className="hover:text-green-500 transition-colors">{msg.whatsapp}</a>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 whitespace-nowrap">
                                        <Clock className="w-3 h-3" />
                                        {new Date(msg.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-zinc-950 p-4 rounded-lg text-zinc-300 text-sm leading-relaxed border border-zinc-800/50">
                                    {msg.message}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    {msg.status !== 'resolved' ? (
                                        <button
                                            onClick={() => handleUpdateStatus(msg.id, 'resolved')}
                                            className="text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 px-3 py-1.5 rounded-full transition-colors border border-yellow-500/20"
                                        >
                                            Marcar como Resolvido
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUpdateStatus(msg.id, 'pending')}
                                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-full transition-colors border border-zinc-700"
                                        >
                                            Reabrir Chamado
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
