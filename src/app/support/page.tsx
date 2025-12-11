
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import LoginModal from "@/components/LoginModal"
import PricingModal from "@/components/PricingModal"
import { Send, CheckCircle, Loader2, ArrowLeft } from "lucide-react"

export default function SupportPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    // Form data
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [whatsapp, setWhatsapp] = useState("")
    const [message, setMessage] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch("/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, whatsapp, message })
            })

            if (res.ok) {
                setIsSent(true)
            } else {
                alert("Erro ao enviar mensagem. Tente novamente.")
            }
        } catch (error) {
            console.error("Erro:", error)
            alert("Erro ao enviar mensagem.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => setShowLoginModal(true)}
            />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-bold">Fale com o Suporte</h1>
                </div>

                {isSent ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
                            <CheckCircle className="w-8 h-8 text-black" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Mensagem Recebida!</h2>
                        <p className="text-zinc-400 mb-6">Nossa equipe entrará em contato em breve através do email ou WhatsApp informado.</p>
                        <button
                            onClick={() => router.push("/")}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
                        >
                            Voltar para o ínicio
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900/50 p-6 md:p-8 rounded-2xl border border-zinc-800 shadow-xl">
                        <p className="text-zinc-400 mb-6">
                            Tem alguma dúvida, sugestão ou precisa de ajuda com suas fotos? Preencha o formulário abaixo.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Seu Nome *</label>
                                <input
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Como devemos te chamar?"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Seu WhatsApp</label>
                                <input
                                    value={whatsapp}
                                    onChange={e => setWhatsapp(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Seu Email *</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Sua Mensagem *</label>
                            <textarea
                                required
                                rows={5}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Descreva sua dúvida ou problema..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-yellow-500 outline-none transition-all resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 hover:translate-y-[-1px]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Enviar Mensagem
                                </>
                            )}
                        </button>
                    </form>
                )}
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
