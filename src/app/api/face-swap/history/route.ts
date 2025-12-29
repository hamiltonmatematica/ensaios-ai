import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Verifica autenticação
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        // Busca últimos 10 jobs completados do usuário
        const jobs = await prisma.faceSwapJob.findMany({
            where: {
                userId: session.user.id,
                status: "COMPLETED",
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 10,
            select: {
                id: true,
                resultImage: true,
                createdAt: true,
            },
        })

        return NextResponse.json({
            jobs,
        })

    } catch (error) {
        console.error("Erro ao buscar histórico:", error)
        return NextResponse.json(
            { error: "Erro ao buscar histórico." },
            { status: 500 }
        )
    }
}
