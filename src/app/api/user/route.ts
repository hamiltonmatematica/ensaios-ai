import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !supabaseUser?.email) {
            return NextResponse.json(
                { error: "Não autenticado." },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email: supabaseUser.email },
            select: {
                id: true,
                credits: true,
                name: true,
                email: true,
                image: true,
                role: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { error: "Usuário não encontrado." },
                { status: 404 }
            )
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error("Erro ao buscar usuário:", error)
        return NextResponse.json(
            { error: "Erro ao buscar informações do usuário." },
            { status: 500 }
        )
    }
}
