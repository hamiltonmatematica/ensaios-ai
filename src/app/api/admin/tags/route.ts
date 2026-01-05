import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

// Verifica se é admin
async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser?.email) return false

    const user = await prisma.user.findUnique({
        where: { email: authUser.email },
        select: { role: true }
    })
    return user?.role === "ADMIN"
}

// GET - Listar todas as tags
export async function GET() {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: { select: { photoModels: true } }
            }
        })
        return NextResponse.json({ tags })
    } catch (error) {
        console.error("Erro ao buscar tags:", error)
        return NextResponse.json({ error: "Erro ao buscar tags" }, { status: 500 })
    }
}

// POST - Criar nova tag
export async function POST(request: NextRequest) {
    try {
        if (!await checkAdmin()) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
        }

        const { name, color } = await request.json()

        if (!name) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
        }

        // Gera slug a partir do nome
        const slug = name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")

        const tag = await prisma.tag.create({
            data: {
                name,
                slug,
                color: color || "#6366f1"
            }
        })

        return NextResponse.json({ tag }, { status: 201 })
    } catch (error) {
        console.error("Erro ao criar tag:", error)
        return NextResponse.json({ error: "Erro ao criar tag" }, { status: 500 })
    }
}

// DELETE - Deletar tag
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

        await prisma.tag.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Erro ao deletar tag:", error)
        return NextResponse.json({ error: "Erro ao deletar tag" }, { status: 500 })
    }
}
