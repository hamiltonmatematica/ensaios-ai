"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
    Camera,
    Sparkles,
    ChevronRight,
    Check,
    Star,
    Zap,
    Shield,
    ArrowRight,
    Play
} from "lucide-react"
import Header from "@/components/Header"
import PricingModal from "@/components/PricingModal"
import LoginModal from "@/components/LoginModal"

const features = [
    {
        icon: Camera,
        title: "Ensaio de IA",
        description: "Envie 3 fotos, escolha o modelo e tenha um ensaio de nível profissional.",
        color: "from-purple-500 to-pink-500",
        iconBg: "bg-purple-500/20",
        iconColor: "text-purple-400"
    },
    {
        icon: Sparkles,
        title: "Face Swap",
        description: "Troque rostos entre imagens de forma rápida e realista com IA.",
        color: "from-pink-500 to-rose-500",
        iconBg: "bg-pink-500/20",
        iconColor: "text-pink-400"
    },
]

const benefits = [
    { icon: Zap, text: "Resultados em segundos" },
    { icon: Shield, text: "Privacidade garantida" },
    { icon: Star, text: "Qualidade profissional" },
]

const portfolioImages = [
    "/portfolio/1.jpg",
    "/portfolio/2.jpg",
    "/portfolio/3.jpg",
    "/portfolio/4.jpg",
]

export default function LandingPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isPricingOpen, setIsPricingOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    // Redireciona para dashboard se já estiver logado
    useEffect(() => {
        if (status === "authenticated" && session) {
            router.push("/dashboard")
        }
    }, [status, session, router])

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Se já estiver logado, não renderiza (vai redirecionar)
    if (session) {
        return null
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
            <Header
                onOpenPricing={() => setIsPricingOpen(true)}
                onOpenLogin={() => setShowLoginModal(true)}
            />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-zinc-950 to-zinc-950" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-purple-600/30 via-pink-500/20 to-transparent rounded-full blur-3xl opacity-50" />

                <div className="relative container mx-auto px-4 py-20 lg:py-32 max-w-6xl">
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-full px-4 py-1.5 mb-6">
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-zinc-300">Tecnologia de ponta em IA Generativa</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            Transforme suas fotos com{" "}
                            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
                                Inteligência Artificial
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Crie ensaios fotográficos profissionais e faça Face Swap em segundos.
                            Simples, rápido e com resultados impressionantes.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="group w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-zinc-900 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 flex items-center justify-center gap-2"
                            >
                                Comece Grátis
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <a
                                href="#como-funciona"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 border border-zinc-700 hover:border-zinc-500 rounded-xl font-medium text-zinc-300 hover:text-white transition-all"
                            >
                                <Play className="w-5 h-5" />
                                Como funciona
                            </a>
                        </div>

                        {/* Benefits */}
                        <div className="flex flex-wrap justify-center gap-6 mt-12">
                            {benefits.map((benefit, i) => (
                                <div key={i} className="flex items-center gap-2 text-zinc-400">
                                    <benefit.icon className="w-4 h-4 text-green-500" />
                                    <span className="text-sm">{benefit.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="como-funciona" className="py-20 lg:py-28">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Nossas Ferramentas de IA
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            Tecnologia avançada para criar imagens incríveis em poucos cliques.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-8 transition-all hover:scale-[1.02]"
                            >
                                <div className={`w-14 h-14 rounded-xl ${feature.iconBg} flex items-center justify-center mb-6`}>
                                    <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-zinc-400 mb-6 leading-relaxed">{feature.description}</p>
                                <button
                                    onClick={() => setShowLoginModal(true)}
                                    className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400 font-medium transition-colors group"
                                >
                                    Experimentar agora
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-20 lg:py-28 bg-zinc-900/50">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Simples de Usar
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            Em apenas 3 passos você terá resultados profissionais.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: "1", title: "Envie suas fotos", desc: "Faça upload das imagens que deseja transformar." },
                            { step: "2", title: "Escolha o estilo", desc: "Selecione entre nossos modelos profissionais." },
                            { step: "3", title: "Baixe o resultado", desc: "Em segundos, sua imagem estará pronta para download." },
                        ].map((item, i) => (
                            <div key={i} className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-zinc-900 mx-auto mb-6">
                                    {item.step}
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-zinc-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Preview Section */}
            <section className="py-20 lg:py-28">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 rounded-3xl p-10 lg:p-16 text-center">
                        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 mb-6">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-400">3 gerações grátis ao se cadastrar</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Comece Agora Mesmo
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto mb-8">
                            Cadastre-se gratuitamente e ganhe 3 créditos para experimentar nossas ferramentas de IA.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-zinc-900 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-yellow-500/25"
                            >
                                Criar Conta Grátis
                            </button>
                            <button
                                onClick={() => setIsPricingOpen(true)}
                                className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 rounded-xl font-medium text-zinc-300 hover:text-white transition-all"
                            >
                                Ver Preços
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 border-t border-zinc-800">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-zinc-900">
                                E
                            </div>
                            <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
                                Ensaios.AI
                            </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-zinc-500">
                            <a href="/support" className="hover:text-white transition-colors">Suporte</a>
                            <span>© 2024 Ensaios.AI. Todos os direitos reservados.</span>
                        </div>
                    </div>
                </div>
            </footer>

            <PricingModal
                isOpen={isPricingOpen}
                onClose={() => setIsPricingOpen(false)}
            />

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </div>
    )
}
