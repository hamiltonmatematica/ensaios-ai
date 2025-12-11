
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST: Enviar mensagem de suporte
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const { name, email, whatsapp, message } = await req.json()

        if (!name || !email || !message) {
            return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
        }

        const supportMessage = await prisma.supportMessage.create({
            data: {
                userId: session?.user?.id || null,
                name,
                email,
                whatsapp: whatsapp || "",
                message,
                status: "PENDING"
            }
        })

        return NextResponse.json({ success: true, id: supportMessage.id })
    } catch (error) {
        console.error("Erro ao enviar mensagem de suporte:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
