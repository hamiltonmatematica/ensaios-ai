import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                creditBalance: true
            }
        })

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        return NextResponse.json({
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            credits: dbUser.creditBalance?.totalCredits || 0
        })
    } catch (error) {
        console.error("Erro ao buscar créditos:", error)
        return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 })
    }
}
