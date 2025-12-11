
"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2, CheckCircle, AlertCircle, KeyRound } from "lucide-react"

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState("")

    if (!token) {
        return (
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Link Inválido</h1>
                <p className="text-zinc-400">O link de recuperação parece inválido ou incompleto.</p>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setErrorMessage("As senhas não coincidem.")
            setStatus("error")
            return
        }

        if (password.length < 6) {
            setErrorMessage("A senha deve ter pelo menos 6 caracteres.")
            setStatus("error")
            return
        }

        setIsLoading(true)
        setStatus("idle")

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            })

            if (res.ok) {
                setStatus("success")
                setTimeout(() => router.push("/"), 3000)
            } else {
                const data = await res.json()
                setErrorMessage(data.error || "Ocorreu um erro ao redefinir a senha.")
                setStatus("error")
            }
        } catch (error) {
            setErrorMessage("Erro de conexão. Tente novamente.")
            setStatus("error")
        } finally {
            setIsLoading(false)
        }
    }

    if (status === "success") {
        return (
            <div className="text-center animate-[fadeIn_0.5s_ease-out]">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Senha Redefinida!</h1>
                <p className="text-zinc-400 mb-8">Sua senha foi alterada com sucesso. Você será redirecionado para a página inicial.</p>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full animate-[progress_3s_ease-out]" style={{ width: "100%" }}></div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-8 h-8 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Nova Senha</h1>
                <p className="text-zinc-400">Digite sua nova senha abaixo.</p>
            </div>

            {status === "error" && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Nova Senha</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500 transition-colors"
                        placeholder="••••••••"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Confirmar Senha</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500 transition-colors"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-6"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Redefinir Senha"}
                </button>
            </form>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
            <Suspense fallback={<Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
