
import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

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

// GET: Listar mensagens
export async function GET() {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const messages = await prisma.supportMessage.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } }
    })

    return NextResponse.json(messages)
}

// PATCH: Atualizar status
export async function PATCH(req: NextRequest) {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    try {
        const { id, status } = await req.json()

        if (!id || !status) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
        }

        const updatedMessage = await prisma.supportMessage.update({
            where: { id },
            data: { status }
        })

        return NextResponse.json(updatedMessage)
    } catch (error) {
        console.error("Erro ao atualizar mensagem:", error)
        return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 })
    }
}
