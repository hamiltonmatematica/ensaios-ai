import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Buscar modelos ativos com tags
        const models = await prisma.photoModel.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
            include: {
                tags: true
            }
        })

        // Buscar todas as tags para filtro
        const tags = await prisma.tag.findMany({
            orderBy: { name: "asc" }
        })

        return NextResponse.json({ models, tags })
    } catch (error) {
        console.error("Erro ao buscar modelos:", error)
        return NextResponse.json(
            { error: "Erro ao buscar modelos." },
            { status: 500 }
        )
    }
}
