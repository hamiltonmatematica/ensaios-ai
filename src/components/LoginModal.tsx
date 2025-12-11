"use client"

import { LogIn, X, Mail } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isLoginWithEmail, setIsLoginWithEmail] = useState(false)

    if (!isOpen) return null

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await signIn("credentials", {
                email,
                password,
                callbackUrl: window.location.href
            })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Acesse sua conta</h2>
                    <p className="text-zinc-400">
                        {isLoginWithEmail
                            ? "Digite seu email e senha para continuar."
                            : "Escolha como deseja entrar na plataforma."}
                    </p>
                </div>

                <div className="space-y-4">
                    {!isLoginWithEmail ? (
                        <>
                            <button
                                onClick={() => signIn("google")}
                                className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl flex items-center justify-center gap-3 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Continuar com Google
                            </button>

                            <button
                                onClick={() => setIsLoginWithEmail(true)}
                                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-colors border border-zinc-700"
                            >
                                <Mail className="w-5 h-5" />
                                Entrar com Email
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleEmailLogin} className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
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
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Senha</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? "Entrando..." : "Entrar / Cadastrar"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsLoginWithEmail(false)}
                                className="w-full py-2 text-zinc-400 hover:text-white text-sm"
                            >
                                Voltar
                            </button>
                        </form>
                    )}

                    <p className="text-center text-xs text-zinc-500 mt-4">
                        Ao continuar, você ganha 3 créditos grátis.
                    </p>
                </div>
            </div>
        </div>
    )
}
