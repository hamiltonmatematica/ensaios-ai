"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Key, Loader2, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RedefinirSenhaPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Verifica se há uma sessão ativa (token de recuperação)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setMessage({ type: "error", text: "Sessão inválida. Solicite um novo link de recuperação." })
            }
        })
    }, [supabase.auth])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)

        if (password !== confirmPassword) {
            setMessage({ type: "error", text: "As senhas não coincidem." })
            setIsLoading(false)
            return
        }

        if (password.length < 6) {
            setMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres." })
            setIsLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({ password })

            if (error) {
                setMessage({ type: "error", text: error.message })
            } else {
                setIsSuccess(true)
                setMessage({
                    type: "success",
                    text: "Senha redefinida com sucesso!",
                })

                // Redireciona após 2 segundos
                setTimeout(() => {
                    router.push("/dashboard")
                }, 2000)
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao redefinir senha." })
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Senha Redefinida!</h1>
                    <p className="text-zinc-400 mb-6">
                        Sua senha foi alterada com sucesso. Redirecionando...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Key className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Redefinir Senha</h1>
                    <p className="text-zinc-400">Digite sua nova senha</p>
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
                            Nova Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Confirmar Senha
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                            placeholder="••••••••"
                            required
                            minLength={6}
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
                            "Redefinir Senha"
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
