
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

// GET: Listar usuários com métricas
export async function GET() {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: {
                    generations: true,
                    transactions: true
                }
            },
            transactions: {
                where: { status: "completed" }, // ou "paid", dependendo do webhook
                select: { amount: true }
            }
        }
        // Nota: para performance em escala real, agregações deveriam ser feitas de outra forma.
        // Para este MVP, calcular no código JS está ok.
    })

    const formattedUsers = users.map(user => {
        const totalSpent = user.transactions.reduce((acc, curr) => acc + curr.amount, 0)
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            credits: user.credits,
            role: user.role,
            totalGenerations: user._count.generations,
            totalSpent: totalSpent,
            lastAccess: user.updatedAt, // Usando updatedAt como proxy de acesso recente por enquanto
            createdAt: user.createdAt
        }
    })

    return NextResponse.json(formattedUsers)
}
