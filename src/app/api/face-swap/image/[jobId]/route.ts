import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params
        console.log(`[Face Swap Image Proxy] Requesting image for job ${jobId}`)

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Busca usuário no Prisma
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true }
        })

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }



        // Buscar job no banco
        const job = await prisma.faceSwapJob.findFirst({
            where: {
                id: jobId,
                userId: dbUser.id,
            },
        })

        if (!job) {
            return NextResponse.json({ error: "Job não encontrado" }, { status: 404 })
        }

        if (!job.resultImage) {
            return NextResponse.json({ error: "Imagem ainda não disponível" }, { status: 404 })
        }

        // Se for base64, extrair e retornar como imagem
        let imageData = job.resultImage

        // Remover prefixo data:image se existir
        const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
            const [, format, base64Data] = base64Match
            const buffer = Buffer.from(base64Data, 'base64')

            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    "Content-Type": `image/${format}`,
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            })
        }

        // Se for URL, fazer proxy
        if (imageData.startsWith('http')) {
            const imageResponse = await fetch(imageData)
            const buffer = await imageResponse.arrayBuffer()
            const contentType = imageResponse.headers.get("content-type") || "image/png"

            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            })
        }

        return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 500 })

    } catch (error) {
        console.error("Erro ao servir imagem:", error)
        return NextResponse.json(
            { error: "Erro ao carregar imagem" },
            { status: 500 }
        )
    }
}
