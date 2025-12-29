"use client"

import { useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Coins, LogOut, User, Menu, X, Camera, MessageCircle, Sparkles } from "lucide-react"

interface HeaderProps {
    onOpenPricing: () => void
    onOpenLogin: () => void
}

export default function Header({ onOpenPricing, onOpenLogin }: HeaderProps) {
    const { data: session, status } = useSession()

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-zinc-900">
                        E
                    </div>
                    <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
                        Ensaios.AI
                    </span>
                </a>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-4">
                    {status === "loading" ? (
                        <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded-full" />
                    ) : !session ? (
                        <>
                            <a
                                href="/support"
                                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                            >
                                Suporte
                            </a>
                            <button
                                onClick={onOpenLogin}
                                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <User className="w-4 h-4" />
                                Entrar
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
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
                                    <span className={`text-sm font-bold flex items-center gap-1 ${session.user?.credits === 0 ? 'text-red-500' : 'text-yellow-400'}`}>
                                        <Coins className="w-3 h-3" />
                                        {session.user?.credits ?? 0}
                                    </span>
                                </div>
                            </div>

                            <a href="/dashboard" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                                Dashboard
                            </a>

                            <a href="/face-swap" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                                Face Swap
                            </a>

                            <a href="/support" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                                Suporte
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

                {/* Mobile: Créditos + Menu */}
                <div className="flex md:hidden items-center gap-3">
                    {session && (
                        <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded-full">
                            <Coins className="w-3 h-3 text-yellow-400" />
                            <span className={`text-sm font-bold ${session.user?.credits === 0 ? 'text-red-500' : 'text-yellow-400'}`}>
                                {session.user?.credits ?? 0}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-zinc-900 border-t border-zinc-800 px-4 py-4 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                    {!session ? (
                        <>
                            <a
                                href="/support"
                                className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Suporte
                            </a>
                            <button
                                onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <User className="w-5 h-5" />
                                Entrar
                            </button>
                        </>
                    ) : (
                        <>
                            <a
                                href="/dashboard"
                                className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <Camera className="w-5 h-5" />
                                Dashboard
                            </a>
                            <a
                                href="/face-swap"
                                className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <Sparkles className="w-5 h-5" />
                                Face Swap
                            </a>
                            <a
                                href="/support"
                                className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Suporte
                            </a>
                            <button
                                onClick={() => { onOpenPricing(); setMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold rounded-lg transition-colors"
                            >
                                <Coins className="w-5 h-5" />
                                Comprar Créditos
                            </button>
                            <button
                                onClick={() => signOut()}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                Sair
                            </button>
                        </>
                    )}
                </div>
            )}
        </header>
    )
}
