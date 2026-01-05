"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { LogIn, Mail, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [name, setName] = useState("")
    const [isSignup, setIsSignup] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isMagicLink, setIsMagicLink] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

    const handleResendConfirmation = async () => {
        if (!unverifiedEmail) return

        try {
            setIsLoading(true)
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: unverifiedEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            })

            if (error) {
                setMessage({ type: "error", text: error.message })
            } else {
                setMessage({ type: "success", text: "Email de confirmação reenviado! Verifique sua caixa de entrada." })
                setUnverifiedEmail(null)
            }
        } catch (error) {
            setMessage({ type: "error", text: "Erro ao reenviar email." })
        } finally {
            setIsLoading(false)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)
        setUnverifiedEmail(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setMessage({ type: "error", text: "Email ou senha incorretos." })
            } else if (data.user && !data.user.email_confirmed_at) {
                await supabase.auth.signOut()
                setUnverifiedEmail(email)
                setMessage({
                    type: "error",
                    text: "Por favor, confirme seu email antes de fazer login."
                })
            } else if (data.session) {
                // Verificar controle de sessão
                const sessionRes = await fetch("/api/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "create" }),
                })

                if (sessionRes.status === 403) {
                    const sessionData = await sessionRes.json()
                    setMessage({
                        type: "error",
                        text: `Limite de dispositivos atingido. ${sessionData.message || ""}`,
                    })
                } else {
                    router.push("/dashboard")
                    router.refresh()
                }
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao fazer login." })
        } finally {
            setIsLoading(false)
        }
    }

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                },
            })

            if (error) {
                setMessage({ type: "error", text: error.message })
            } else {
                setMessage({ type: "success", text: "Link de acesso enviado para seu email!" })
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: "error", text: "Erro ao enviar link mágico." })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
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
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name: name || email.split('@')[0] },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            })

            if (error) {
                let errorMsg = error.message
                if (errorMsg.includes("already registered")) {
                    errorMsg = "Este email já está cadastrado."
                }
                setMessage({ type: "error", text: errorMsg })
            } else {
                setMessage({ type: "success", text: "Conta criada! Verifique seu email para confirmar." })
                setEmail(""); setPassword(""); setConfirmPassword(""); setName("")
            }
        } catch (error) {
            setMessage({ type: "error", text: "Erro ao criar conta." })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {isSignup ? "Criar Conta" : "Entrar"}
                    </h1>
                    <p className="text-zinc-400">
                        {isSignup ? "Crie sua conta grátis" : "Acesse sua conta"}
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
                        {unverifiedEmail && message.type === "error" && (
                            <button
                                onClick={handleResendConfirmation}
                                className="block mt-2 text-xs font-bold underline hover:opacity-80"
                            >
                                Reenviar email de confirmação
                            </button>
                        )}
                    </div>
                )}

                {/* Se cadastro foi sucesso, mostra só mensagem e botão de login */}
                {isSignup && message?.type === "success" ? (
                    <div className="space-y-6">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Mail className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-center text-white">Verifique seu email</h2>
                        <p className="text-zinc-400 text-center text-sm">
                            Enviamos um link de confirmação para <strong>{email}</strong>.
                            Clique no link para ativar sua conta.
                        </p>
                        <button
                            onClick={() => {
                                setIsSignup(false)
                                setMessage(null)
                            }}
                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Voltar para o Login
                        </button>
                    </div>
                ) : isSignup ? (
                    // FORMULÁRIO DE CADASTRO
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">
                                Nome (opcional)
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                                placeholder="Seu nome"
                            />
                        </div>

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

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">
                                Senha
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                                placeholder="Mínimo 6 caracteres"
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
                                placeholder="Repita a senha"
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
                                "Criar Conta Grátis"
                            )}
                        </button>
                    </form>
                ) : !isMagicLink ? (
                    // FORMULÁRIO DE LOGIN COM SENHA
                    <form onSubmit={handleEmailLogin} className="space-y-4">
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
                            />
                            <a
                                href="/recuperar-senha"
                                className="text-xs text-yellow-500 hover:text-yellow-400 mt-2 block text-right"
                            >
                                Esqueceu a senha?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Entrar"
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleMagicLink} className="space-y-4">
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
                                <>
                                    <Mail className="w-5 h-5" />
                                    Enviar Link de Acesso
                                </>
                            )}
                        </button>
                    </form>
                )}

                {!isSignup && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-zinc-900 text-zinc-500">ou</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsMagicLink(!isMagicLink)}
                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
                        >
                            {isMagicLink ? "Login com Senha" : "Login sem Senha"}
                        </button>
                    </>
                )}

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setIsSignup(!isSignup)
                        setIsMagicLink(false)
                        setMessage(null)
                    }}
                    className="w-full py-3 bg-zinc-800/50 hover:bg-zinc-700 border-2 border-yellow-500/30 hover:border-yellow-500/60 text-white font-semibold rounded-lg transition-all"
                >
                    {isSignup ? "Já tem conta? Faça login" : "🎁 Não tem conta? Crie grátis"}
                </button>
            </div>
        </div>
    )
}
