"use client"

import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase-client"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

function EmailConfirmadoContent() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [state, setState] = useState<"loading" | "setPassword" | "success" | "error">("loading")
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    useEffect(() => {
        const checkStatus = async () => {
            const tokenHash = searchParams.get("token_hash")
            const type = searchParams.get("type")
            const verified = searchParams.get("verified")

            // Se veio do callback com verified=true, ou se já temos sessão
            if (verified === "true") {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setState("setPassword") // Assume que precisa definir senha se veio de signup
                    setIsLoading(false)
                    return
                }
            }

            // Fallback: Tenta verificar token se fornecido (fluxo legado ou direto)
            if (tokenHash && type) {
                try {
                    const { error } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: type as "email" | "signup",
                    })

                    if (error) {
                        setState("error")
                        setMessage({ type: "error", text: "Token inválido ou expirado." })
                    } else {
                        setState("setPassword") // Permite definir senha após verificação
                    }
                } catch (error) {
                    console.error(error)
                    setState("error")
                    setMessage({ type: "error", text: "Erro ao verificar token." })
                } finally {
                    setIsLoading(false)
                }
                return
            }

            // Se chegamos aqui sem verified=true e sem token, verifica sessão existente
            const { data: { user } } = await supabase.auth.getUser()
            if (user && user.email_confirmed_at) {
                // Já logado e confirmado
                setState("success")
                setTimeout(() => router.push("/dashboard"), 1500)
                setIsLoading(false)
                return
            }

            // Se nada funcionou
            setState("error")
            setMessage({ type: "error", text: "Link inválido ou expirado." })
            setIsLoading(false)
        }

        checkStatus()
    }, [searchParams, supabase.auth, router])

    const handleSetPassword = async (e: React.FormEvent) => {
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
                setState("success")
                setMessage({ type: "success", text: "Senha definida com sucesso!" })
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao definir senha." })
        } finally {
            setIsLoading(false)
        }
    }

    if (state === "loading") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Verificando token...</p>
                </div>
            </div>
        )
    }

    if (state === "error") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Erro</h1>
                    <p className="text-zinc-400 mb-6">{message?.text}</p>
                    <a
                        href="/login"
                        className="inline-block w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
                    >
                        Voltar para Login
                    </a>
                </div>
            </div>
        )
    }

    if (state === "success") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Email Confirmado!</h1>
                    <p className="text-zinc-400 mb-6">
                        Seu email foi verificado com sucesso. Redirecionando para o dashboard...
                    </p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
                    >
                        Acessar Plataforma
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Confirme seu Email</h1>
                    <p className="text-zinc-400">Crie sua senha para acessar a plataforma</p>
                </div>

                {message && message.type === "error" && (
                    <div className="p-4 rounded-lg mb-6 text-sm bg-red-500/10 text-red-500 border border-red-500/20">
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSetPassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Senha
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
                            "Definir Senha"
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function EmailConfirmadoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Carregando...</p>
                </div>
            </div>
        }>
            <EmailConfirmadoContent />
        </Suspense>
    )
}
