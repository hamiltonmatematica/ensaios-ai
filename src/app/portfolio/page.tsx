import { prisma } from "@/lib/prisma"
import { Image as ImageIcon, Camera } from "lucide-react"

export const dynamic = 'force-dynamic'

async function getPortfolioModels() {
    return await prisma.photoModel.findMany({
        where: {
            isActive: true
        },
        orderBy: {
            displayOrder: 'asc' // Ou 'createdAt' se preferir ordem de criação
        },
        include: {
            tags: true
        }
    })
}

export default async function PortfolioPage() {
    const models = await getPortfolioModels()

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            {/* Header / Hero Section */}
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 py-16 px-4 sm:px-8 border-b border-zinc-900">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-medium mb-6">
                        <Camera className="w-4 h-4" />
                        <span>Catálogo Oficial</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Portfólio de Estilos
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                        Escolha o número do seu estilo favorito para o seu ensaio.
                        Cada modelo foi cuidadosamente criado para resultados profissionais.
                    </p>
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
                {models.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                        <ImageIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">Nenhum modelo disponível</h3>
                        <p className="text-zinc-500">Volte mais tarde para ver novidades!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {models.map((model, index) => (
                            <div
                                key={model.id}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/10"
                            >
                                {/* Imagem */}
                                <div className="aspect-[2/3] relative overflow-hidden bg-zinc-800">
                                    {/* Number Badge */}
                                    <div className="absolute top-4 left-4 z-20 flex items-center justify-center w-12 h-12 bg-yellow-500 text-black font-bold text-xl rounded-xl shadow-lg font-mono">
                                        #{index + 1}
                                    </div>

                                    {/* Premium Badge (se houver essa lógica) */}
                                    {model.isPremium && (
                                        <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-purple-500/90 text-white text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm">
                                            PREMIUM
                                        </div>
                                    )}

                                    <img
                                        src={model.thumbnailUrl}
                                        alt={model.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        loading="lazy"
                                    />

                                    {/* Overlay gradiente */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                </div>

                                {/* Info */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-12">
                                    <h3 className="text-2xl font-bold text-white mb-2">{model.name}</h3>
                                    <p className="text-zinc-300 text-sm line-clamp-2 mb-4">
                                        {model.description}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 rounded-md bg-zinc-800/80 text-zinc-400 text-xs font-medium border border-zinc-700">
                                            {model.category}
                                        </span>
                                        {model.tags.slice(0, 2).map(tag => (
                                            <span
                                                key={tag.id}
                                                className="px-2 py-1 rounded-md bg-zinc-800/80 text-zinc-400 text-xs font-medium border border-zinc-700"
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer simples */}
            <footer className="py-12 text-center text-zinc-500 text-sm border-t border-zinc-900 mt-12 bg-zinc-950">
                <p>© {new Date().getFullYear()} Ensaios.AI - Todos os direitos reservados.</p>
            </footer>
        </div>
    )
}
