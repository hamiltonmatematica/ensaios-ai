import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadImage } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

// Verifica se é admin
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return false

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })
    return user?.role === "ADMIN"
}

// POST - Upload de imagem para Supabase Storage
export async function POST(request: NextRequest) {
    try {
        if (!await checkAdmin()) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
        }

        const body = await request.json()
        const { base64Data, fileName } = body

        if (!base64Data) {
            return NextResponse.json({ error: "Imagem não fornecida" }, { status: 400 })
        }

        // Faz upload para Supabase Storage
        const imageUrl = await uploadImage(base64Data, fileName || 'thumbnail')

        if (!imageUrl) {
            return NextResponse.json({ error: "Erro no upload. Verifique as variáveis SUPABASE." }, { status: 500 })
        }

        return NextResponse.json({ url: imageUrl })
    } catch (error) {
        console.error("Erro no upload:", error)
        return NextResponse.json({ error: "Erro ao processar upload" }, { status: 500 })
    }
}
