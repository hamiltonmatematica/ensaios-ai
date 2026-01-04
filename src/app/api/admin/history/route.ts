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

        // Total de cada ferramenta
        const totalGenerations = await prisma.generation.count()
        const totalFaceSwaps = await prisma.faceSwapJob.count()
        const totalUpscales = await prisma.imageUpscale.count()
        const totalUsage = totalGenerations + totalFaceSwaps + totalUpscales

        // Total revenue from completed transactions
        const transactions = await prisma.transaction.findMany({
            where: { status: "completed" },
            select: { amount: true }
        })
        const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0)

        // Total credits used - soma de todas as operações
        // Generations: 1 crédito cada
        // Face Swap: 5 créditos cada (desde 03/01)
        // Upscale: baseado no campo creditsUsed
        const upscales = await prisma.imageUpscale.findMany({
            select: { creditsUsed: true }
        })
        const creditsFromUpscales = upscales.reduce((acc, u) => acc + u.creditsUsed, 0)
        const totalCreditsUsed = totalGenerations * 1 + totalFaceSwaps * 5 + creditsFromUpscales

        // Breakdown by tool
        const generationsByType = {
            ensaio: totalGenerations,
            faceSwap: totalFaceSwaps,
            upscale: totalUpscales
        }

        // Recent activity - últimas 50 atividades combinadas
        const recentGenerations = await prisma.generation.findMany({
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true } },
                model: { select: { name: true } }
            }
        })

        const recentFaceSwaps = await prisma.faceSwapJob.findMany({
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true } }
            }
        })

        const recentUpscales = await prisma.imageUpscale.findMany({
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true } }
            }
        })

        const recentTransactions = await prisma.transaction.findMany({
            where: { status: "completed" },
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true } }
            }
        })

        // Combina todas as atividades
        const recentActivity = [
            ...recentGenerations.map(gen => ({
                id: gen.id,
                type: 'generation' as const,
                userName: gen.user.name || "Anônimo",
                userEmail: gen.user.email,
                details: `Gerou Ensaio de IA - ${gen.model.name}`,
                credits: 1,
                createdAt: gen.createdAt.toISOString()
            })),
            ...recentFaceSwaps.map(fs => ({
                id: fs.id,
                type: 'generation' as const,
                userName: fs.user.name || "Anônimo",
                userEmail: fs.user.email,
                details: `Realizou Face Swap - Status: ${fs.status}`,
                credits: 5,
                createdAt: fs.createdAt.toISOString()
            })),
            ...recentUpscales.map(up => ({
                id: up.id,
                type: 'generation' as const,
                userName: up.user.name || "Anônimo",
                userEmail: up.user.email,
                details: `Upscale ${up.scale} - Status: ${up.status}`,
                credits: up.creditsUsed,
                createdAt: up.createdAt.toISOString()
            })),
            ...recentTransactions.map(txn => ({
                id: txn.id,
                type: 'purchase' as const,
                userName: txn.user.name || "Anônimo",
                userEmail: txn.user.email,
                details: `Compra de ${txn.credits} créditos`,
                amount: txn.amount,
                createdAt: txn.createdAt.toISOString()
            }))
        ]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50)

        return NextResponse.json({
            totalUsers,
            totalGenerations: totalUsage,
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
