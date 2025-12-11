"use client"

import { LogIn, X, Mail, ArrowLeft, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

type AuthMode = "options" | "login" | "register" | "forgot-password"

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [mode, setMode] = useState<AuthMode>("options")
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
        setMode("options")
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

                {mode !== "options" && (
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
                        {mode === "options" && "Bem-vindo"}
                        {mode === "login" && "Entrar na Conta"}
                        {mode === "register" && "Criar Nova Conta"}
                        {mode === "forgot-password" && "Recuperar Senha"}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        {mode === "options" && "Escolha como deseja continuar"}
                        {mode === "login" && "Digite suas credenciais"}
                        {mode === "register" && "Preencha os dados e ganhe 3 créditos"}
                        {mode === "forgot-password" && "Enviaremos um link para seu email"}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {message.text}
                    </div>
                )}

                <div className="space-y-4">
                    {mode === "options" ? (
                        <>
                            <button
                                onClick={() => signIn("google")}
                                className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl flex items-center justify-center gap-3 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continuar com Google
                            </button>

                            <button
                                onClick={() => setMode("login")}
                                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-colors border border-zinc-700"
                            >
                                <Mail className="w-5 h-5" />
                                Entrar com Email
                            </button>

                            <div className="pt-2 border-t border-zinc-800 mt-4">
                                <p className="text-center text-zinc-500 text-sm mb-3">Não tem uma conta?</p>
                                <button
                                    onClick={() => setMode("register")}
                                    className="w-full py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-bold rounded-xl transition-colors border border-yellow-500/20"
                                >
                                    Criar Conta Grátis
                                </button>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgotPassword} className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
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
                    )}
                </div>
            </div>
        </div>
    )
}
