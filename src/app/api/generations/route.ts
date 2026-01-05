
import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user?.email) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
        }

        // Busca usuário no Prisma
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true }
        })

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        const generations = await prisma.generation.findMany({
            where: {
                userId: dbUser.id,
                status: "COMPLETED", // Apenas as completas? ou todas? Vamos mostrar todas para debug, mas principal focos nas completas.
                // Na verdade o usuário quer ver as FOTOS. Então só completas com resultUrl faz sentido.
                // Mas se tiver PROCESSING, é legal mostrar loading.
            },
            include: {
                model: {
                    select: {
                        name: true,
                        thumbnailUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(generations)
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
