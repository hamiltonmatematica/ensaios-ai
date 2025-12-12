"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { X, Check, Sparkles, CreditCard, Loader2 } from "lucide-react"
import { CREDIT_PACKAGES } from "@/lib/stripe"

interface PricingModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState<string | null>(null)

    if (!isOpen) return null

    const handlePurchase = async (packageId: string) => {
        // Se não estiver logado, fazer login primeiro
        if (!session) {
            signIn("google")
            return
        }

        setLoading(packageId)

        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ packageId }),
            })

            const data = await res.json()

            if (data.url) {
                window.location.href = data.url
            } else {
                alert(data.error || "Erro ao processar pagamento")
            }
        } catch (error) {
            console.error("Erro:", error)
            alert("Erro ao conectar com o servidor de pagamentos")
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-zinc-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-start gap-4 bg-zinc-900">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 shrink-0" />
                            Comprar Créditos
                        </h2>
                        <p className="text-zinc-400 text-xs sm:text-sm mt-1">Adquira pacotes para gerar mais ensaios.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-zinc-950/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {CREDIT_PACKAGES.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={`
                  relative flex flex-col p-6 rounded-xl border-2 transition-all hover:scale-[1.02]
                  ${pkg.isBestValue ? 'border-yellow-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'}
                `}
                            >
                                {pkg.isBestValue && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase">
                                        Melhor Escolha
                                    </div>
                                )}

                                <h3 className="text-lg font-medium text-zinc-300 mb-1">{pkg.name}</h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-3xl font-bold text-white">{pkg.priceDisplay}</span>
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                                        <Check className="w-4 h-4 text-green-500" />
                                        <span>{pkg.images} Gerações de Imagem</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                                        <Check className="w-4 h-4 text-green-500" />
                                        <span>Acesso a Modelos Premium</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-zinc-300">
                                        <Check className="w-4 h-4 text-green-500" />
                                        <span>Suporte Prioritário</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs font-semibold text-yellow-500/80 mt-2 bg-yellow-500/10 p-2 rounded">
                                        {pkg.savings}
                                    </li>
                                </ul>

                                <button
                                    onClick={() => handlePurchase(pkg.id)}
                                    disabled={loading !== null}
                                    className={`
                    w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2
                    ${pkg.isBestValue
                                            ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-white'}
                    ${loading === pkg.id ? 'opacity-70 cursor-wait' : ''}
                  `}
                                >
                                    {loading === pkg.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-4 h-4" />
                                            Comprar Agora
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 text-center border-t border-zinc-800 pt-6">
                        <p className="text-xs text-zinc-500">
                            Pagamento seguro processado via Stripe. Aceita Pix, Boleto e Cartão.
                            Os créditos nunca expiram. Ao continuar, você concorda com nossos termos de uso.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
