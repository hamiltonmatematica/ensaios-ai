"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Mail, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RecuperarSenhaPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
            })

            if (error) {
                // Traduz mensagens comuns do Supabase
                let errorMsg = error.message
                if (errorMsg.includes("For security purposes")) {
                    errorMsg = "Por questões de segurança, aguarde 60 segundos antes de solicitar novamente."
                }
                setMessage({ type: "error", text: errorMsg })
            } else {
                setMessage({
                    type: "success",
                    text: "Se o email existir, você receberá um link de recuperação.",
                })
                setEmail("")
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao solicitar recuperação." })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para login
                </Link>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Recuperar Senha</h1>
                    <p className="text-zinc-400">
                        Enviaremos um link de recuperação para seu email
                    </p>
                </div>

                {message && (
                    <div
                        className={`p-4 rounded-lg mb-6 text-sm ${message.type === "success"
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : "bg-red-500/10 text-red-500 border border-red-500/20"
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            "Enviar Link de Recuperação"
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
