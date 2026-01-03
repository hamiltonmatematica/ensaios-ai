"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { X, Check, Sparkles, CreditCard, Loader2, Zap } from "lucide-react"
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

            <div className="relative bg-zinc-900 border border-zinc-700 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-start gap-4 bg-gradient-to-r from-zinc-900 to-zinc-800">
                    <div className="flex-1">
                        <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-yellow-500" />
                            Comprar Créditos
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">Escolha o pacote ideal para suas necessidades</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>

                {/* Pricing Cards */}
                <div className="p-6 overflow-y-auto bg-zinc-950">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {CREDIT_PACKAGES.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={`
                                    relative flex flex-col p-5 rounded-xl border-2 transition-all hover:scale-[1.02]
                                    ${pkg.isBestValue
                                        ? 'border-yellow-500 bg-gradient-to-b from-yellow-500/10 to-zinc-900 shadow-lg shadow-yellow-500/20'
                                        : 'border-zinc-800 bg-zinc-900/50'
                                    }
                                `}
                            >
                                {/* Badge */}
                                {pkg.badge && (
                                    <div className={`
                                        absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full uppercase whitespace-nowrap
                                        ${pkg.isBestValue
                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        }
                                    `}>
                                        {pkg.badge}
                                    </div>
                                )}

                                {/* Package Name */}
                                <h3 className="text-xl font-bold text-white mb-1 text-center">{pkg.name}</h3>

                                {/* Credits */}
                                <div className="text-center mb-4">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Zap className="w-5 h-5 text-yellow-500" />
                                        <span className="text-3xl font-bold text-white">{pkg.credits}</span>
                                    </div>
                                    <span className="text-xs text-zinc-400">
                                        {pkg.bonusCredits > 0
                                            ? `${pkg.baseCredits} créditos + ${pkg.bonusCredits} bônus`
                                            : 'créditos'
                                        }
                                    </span>
                                </div>

                                {/* Price */}
                                <div className="text-center mb-4 pb-4 border-b border-zinc-800">
                                    <div className="text-3xl font-bold text-white mb-1">{pkg.priceDisplay}</div>
                                    <div className="text-xs text-zinc-500">{pkg.pricePerCredit}/crédito</div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-2 mb-6 flex-1">
                                    {pkg.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Buy Button */}
                                <button
                                    onClick={() => handlePurchase(pkg.id)}
                                    disabled={loading !== null}
                                    className={`
                                        w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2
                                        ${pkg.isBestValue
                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg shadow-yellow-500/30'
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                        }
                                        ${loading === pkg.id ? 'opacity-70 cursor-wait' : ''}
                                        disabled:opacity-50 disabled:cursor-not-allowed
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

                    {/* Footer Info */}
                    <div className="text-center border-t border-zinc-800 pt-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-zinc-400">Créditos válidos por 90 dias</span>
                        </div>
                        <p className="text-xs text-zinc-500 max-w-2xl mx-auto">
                            Pagamento seguro processado via Stripe. Aceita <strong>Pix</strong>, <strong>Boleto</strong> e <strong>Cartão</strong>.
                            Ao continuar, você concorda com nossos termos de uso.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
