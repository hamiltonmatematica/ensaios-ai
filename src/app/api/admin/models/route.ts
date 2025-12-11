import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

// Helper para verificar admin
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return false

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })
    return user?.role === "ADMIN"
}

// GET - Listar todos os modelos (para admin)
export async function GET() {
    try {
        if (!await checkAdmin()) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
        }

        const models = await prisma.photoModel.findMany({
            orderBy: { displayOrder: "asc" },
            include: {
                tags: true,
                _count: { select: { generations: true } }
            }
        })
        return NextResponse.json({ models })
    } catch (error) {
        console.error("Erro ao buscar modelos:", error)
        return NextResponse.json({ error: "Erro ao buscar modelos" }, { status: 500 })
    }
}

// POST - Criar novo modelo
export async function POST(request: NextRequest) {
    try {
        if (!await checkAdmin()) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            description,
            thumbnailUrl,
            promptTemplate,
            tagIds,
            isFree,
            creditsRequired,
            isActive,
            displayOrder
        } = body

        if (!name || !thumbnailUrl || !promptTemplate) {
            return NextResponse.json({
                error: "Nome, foto e prompt são obrigatórios"
            }, { status: 400 })
        }

        const model = await prisma.photoModel.create({
            data: {
                name,
                description: description || "",
                thumbnailUrl,
                promptTemplate,
                isPremium: !isFree,
                creditsRequired: isFree ? 0 : (creditsRequired || 1),
                isActive: isActive ?? true,
                displayOrder: displayOrder || 0,
                tags: {
                    connect: (tagIds || []).map((id: string) => ({ id }))
                }
            },
            include: { tags: true }
        })

        return NextResponse.json({ model }, { status: 201 })
    } catch (error) {
        console.error("Erro ao criar modelo:", error)
        return NextResponse.json({ error: "Erro ao criar modelo" }, { status: 500 })
    }
}

// PUT - Atualizar modelo
export async function PUT(request: NextRequest) {
    try {
        if (!await checkAdmin()) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
        }

        const body = await request.json()
        const {
            id,
            name,
            description,
            thumbnailUrl,
            promptTemplate,
            tagIds,
            isFree,
            creditsRequired,
            isActive,
            displayOrder
        } = body

        if (!id) {
            return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
        }

        const model = await prisma.photoModel.update({
            where: { id },
            data: {
                name,
                description,
                thumbnailUrl,
                promptTemplate,
                isPremium: !isFree,
                creditsRequired: isFree ? 0 : (creditsRequired || 1),
                isActive,
                displayOrder,
                tags: {
                    set: (tagIds || []).map((id: string) => ({ id }))
                }
            },
            include: { tags: true }
        })

        return NextResponse.json({ model })
    } catch (error) {
        console.error("Erro ao atualizar modelo:", error)
        return NextResponse.json({ error: "Erro ao atualizar modelo" }, { status: 500 })
    }
}

// DELETE - Deletar modelo
export async function DELETE(request: NextRequest) {
    try {
        if (!await checkAdmin()) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
        }

        await prisma.photoModel.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Erro ao deletar modelo:", error)
        return NextResponse.json({ error: "Erro ao deletar modelo" }, { status: 500 })
    }
}
