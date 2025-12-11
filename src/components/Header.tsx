"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { Coins, LogOut, User } from "lucide-react"

interface HeaderProps {
    onOpenPricing: () => void
}

export default function Header({ onOpenPricing }: HeaderProps) {
    const { data: session, status } = useSession()

    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-zinc-900">
                        E
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
                        Ensaios.AI
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {status === "loading" ? (
                        <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded-full" />
                    ) : !session ? (
                        <button
                            onClick={() => signIn("google")}
                            className="text-sm font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <User className="w-4 h-4" />
                            Entrar
                        </button>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {session.user?.image && (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || "Usuário"}
                                        className="w-8 h-8 rounded-full border border-zinc-700"
                                    />
                                )}
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-zinc-400">Créditos</span>
                                    <span className={`text-sm font-bold flex items-center gap-1 ${session.user?.credits === 0 ? 'text-red-500' : 'text-yellow-400'
                                        }`}>
                                        <Coins className="w-3 h-3" />
                                        {session.user?.credits ?? 0}
                                    </span>
                                </div>
                            </div>

                            <a
                                href="/my-photos"
                                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors mr-2"
                            >
                                Meus Ensaios
                            </a>

                            <a
                                href="/support"
                                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors mr-2"
                            >
                                Fale com o Suporte
                            </a>

                            <button
                                onClick={onOpenPricing}
                                className="bg-yellow-500 hover:bg-yellow-400 text-zinc-900 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                            >
                                Comprar Créditos
                            </button>

                            <button
                                onClick={() => signOut()}
                                className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-colors"
                                title="Sair"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
