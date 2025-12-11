
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
        }

        const generations = await prisma.generation.findMany({
            where: {
                userId: session.user.id,
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
