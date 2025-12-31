"use client"

import { Coins, CreditCard, History, Zap } from "lucide-react"
import { useState, useEffect } from "react"


interface Transaction {
    id: string
    type: string
    amount: number
    featureUsed: string | null
    createdAt: string
}

interface CreditDashboardProps {
    initialBalance: number
    onOpenPricing: () => void
}

export function CreditDashboard({ initialBalance, onOpenPricing }: CreditDashboardProps) {
    const [balance, setBalance] = useState(initialBalance)
    const [history, setHistory] = useState<Transaction[]>([])


    useEffect(() => {
        fetchHistory()
        fetchBalance()
    }, [])

    const fetchBalance = async () => {
        try {
            const res = await fetch("/api/credits/check-balance")
            const data = await res.json()
            if (data.totalCredits !== undefined) {
                setBalance(data.totalCredits)
            }
        } catch (error) {
            console.error("Erro ao buscar saldo", error)
        }
    }

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/credits/history")
            const data = await res.json()
            if (data.transactions) {
                setHistory(data.transactions)
            }
        } catch (error) {
            console.error("Erro ao buscar histórico", error)
        }
    }

    const handleBuyCredits = () => {
        onOpenPricing()
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
            {/* Saldo Principal */}
            <div className="col-span-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl shadow-lg">
                <div className="p-6">
                    <div className="flex flex-row items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-indigo-100">
                            Saldo Disponível
                        </h3>
                        <Coins className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{balance} Créditos</div>
                        <p className="text-xs text-zinc-400 mt-1">
                            Use seus créditos para gerar imagens, vídeos e mais.
                        </p>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={handleBuyCredits}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 h-9 px-4 py-2"
                            >
                                <Zap className="mr-2 h-4 w-4" /> Recarregar
                            </button>
                            <button
                                onClick={handleBuyCredits}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-indigo-500/30 bg-transparent text-indigo-300 hover:bg-indigo-500/20 h-9 px-4 py-2"
                            >
                                Ver Planos
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Histórico Recente */}
            <div className="col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-sm">
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <History className="h-4 w-4" /> Atividade Recente
                        </h3>
                    </div>
                    <div>
                        <div className="space-y-4 max-h-[130px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-zinc-500">Nenhuma atividade recente.</p>
                            ) : (
                                history.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${tx.amount > 0 ? "bg-green-500" : "bg-red-500"}`} />
                                            <span className="text-zinc-300">
                                                {tx.featureUsed ? tx.featureUsed.replace(/_/g, " ") : tx.type}
                                            </span>
                                        </div>
                                        <span className={`font-medium ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
