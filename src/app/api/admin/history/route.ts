
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return false

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })
    return user?.role === "ADMIN"
}

// GET: Obter estatísticas e histórico da plataforma
export async function GET() {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    try {
        // Total users
        const totalUsers = await prisma.user.count()

        // Total generations
        const totalGenerations = await prisma.generation.count()

        // Total revenue from completed transactions
        const transactions = await prisma.transaction.findMany({
            where: { status: "completed" },
            select: { amount: true }
        })
        const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0)

        // Total credits used (sum of creditsCost from all generations)
        const generations = await prisma.generation.findMany({
            select: { creditsCost: true }
        })
        const totalCreditsUsed = generations.reduce((acc, g) => acc + (g.creditsCost || 0), 0)

        // Generations by type
        const generationsByType = {
            ensaio: await prisma.generation.count({ where: { type: "ensaio" } }),
            faceSwap: await prisma.generation.count({ where: { type: "face-swap" } }),
            upscale: await prisma.generation.count({ where: { type: "upscale" } })
        }

        // Recent activity - últimas 50 atividades (gerações + compras)
        const recentGenerations = await prisma.generation.findMany({
            take: 25,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        const recentTransactions = await prisma.transaction.findMany({
            where: { status: "completed" },
            take: 25,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        // Combina e ordena por data
        const recentActivity = [
            ...recentGenerations.map(gen => ({
                id: gen.id,
                type: 'generation' as const,
                userName: gen.user.name || "Anônimo",
                userEmail: gen.user.email,
                details: getGenerationDetails(gen.type, gen.quality),
                credits: gen.creditsCost,
                createdAt: gen.createdAt.toISOString()
            })),
            ...recentTransactions.map(txn => ({
                id: txn.id,
                type: 'purchase' as const,
                userName: txn.user.name || "Anônimo",
                userEmail: txn.user.email,
                details: `Compra de ${txn.creditsPurchased || 0} créditos`,
                amount: txn.amount,
                createdAt: txn.createdAt.toISOString()
            }))
        ]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50)

        return NextResponse.json({
            totalUsers,
            totalGenerations,
            totalRevenue,
            totalCreditsUsed,
            generationsByType,
            recentActivity
        })

    } catch (error) {
        console.error("Erro ao buscar estatísticas:", error)
        return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 })
    }
}

function getGenerationDetails(type: string, quality?: string | null): string {
    const qualityMap: Record<string, string> = {
        'standard': 'Standard',
        'enhanced': 'Enhanced',
        'premium': 'Premium'
    }

    switch (type) {
        case 'ensaio':
            return `Gerou Ensaio de IA - Qualidade ${qualityMap[quality || 'standard'] || 'Standard'}`
        case 'face-swap':
            return 'Realizou Face Swap'
        case 'upscale':
            return 'Fez Upscale de Imagem'
        default:
            return 'Geração desconhecida'
    }
}
