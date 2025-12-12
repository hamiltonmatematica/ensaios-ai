"use client"

import { LogIn, X, ArrowLeft, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

type AuthMode = "login" | "register" | "forgot-password"

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [mode, setMode] = useState<AuthMode>("login")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

    if (!isOpen) return null

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)
        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (res?.error) {
                setMessage({ type: "error", text: "Email ou senha incorretos." })
            } else {
                window.location.reload()
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao fazer login." })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Erro ao criar conta." })
            } else {
                setMessage({ type: "success", text: "Conta criada! Fazendo login..." })
                // Auto login após cadastro
                await signIn("credentials", {
                    email,
                    password,
                    callbackUrl: window.location.href
                })
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao criar conta." })
        } finally {
            setIsLoading(false)
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            if (res.ok) {
                setMessage({ type: "success", text: "Se o email existir, enviamos um link de recuperação." })
            } else {
                setMessage({ type: "error", text: "Erro ao solicitar recuperação." })
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao processar solicitação." })
        } finally {
            setIsLoading(false)
        }
    }

    const resetState = () => {
        setMode("login")
        setMessage(null)
        setEmail("")
        setPassword("")
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {mode !== "login" && (
                    <button
                        onClick={resetState}
                        className="absolute top-4 left-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors z-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}

                <div className="text-center mb-8 mt-4">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {mode === "login" && "Entrar"}
                        {mode === "register" && "Criar Conta"}
                        {mode === "forgot-password" && "Recuperar Senha"}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        {mode === "login" && "Digite seu email e senha"}
                        {mode === "register" && "Preencha os dados e ganhe 3 créditos grátis"}
                        {mode === "forgot-password" && "Enviaremos um link para seu email"}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgotPassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>

                    {mode !== "forgot-password" && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            {mode === "login" && (
                                <button
                                    type="button"
                                    onClick={() => setMode("forgot-password")}
                                    className="text-xs text-yellow-500 hover:text-yellow-400 mt-2 block text-right"
                                >
                                    Esqueceu a senha?
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            mode === "login" ? "Entrar" : mode === "register" ? "Criar Conta" : "Enviar Link"
                        )}
                    </button>
                </form>

                {mode === "login" && (
                    <div className="pt-4 border-t border-zinc-800 mt-6">
                        <p className="text-center text-zinc-500 text-sm mb-3">Não tem uma conta?</p>
                        <button
                            onClick={() => setMode("register")}
                            className="w-full py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-bold rounded-xl transition-colors border border-yellow-500/20"
                        >
                            Criar Conta Grátis
                        </button>
                    </div>
                )}

                {mode === "register" && (
                    <div className="pt-4 border-t border-zinc-800 mt-6">
                        <p className="text-center text-zinc-500 text-sm mb-3">Já tem uma conta?</p>
                        <button
                            onClick={() => setMode("login")}
                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors border border-zinc-700"
                        >
                            Fazer Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
