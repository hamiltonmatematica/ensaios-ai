import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Evita pre-rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const type = searchParams.get("type") || "generations" // generations, face-swap, upscale

        const supabase = await createClient()
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !supabaseUser?.email) {
            return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: supabaseUser.email },
            select: { id: true },
        })

        if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
        }

        let items: any[] = []

        if (type === "generations") {
            const generations = await prisma.generation.findMany({
                where: {
                    userId: user.id,
                    status: "COMPLETED",
                },
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                    model: {
                        select: { name: true }
                    }
                }
            })

            items = generations.map(g => ({
                id: g.id,
                type: "generations",
                resultUrl: g.resultUrl,
                status: g.status,
                createdAt: g.createdAt,
                details: `Modelo: ${g.model.name} (${g.aspectRatio})`
            }))
        }
        else if (type === "face-swap") {
            const jobs = await prisma.faceSwapJob.findMany({
                where: {
                    userId: user.id,
                    status: "COMPLETED",
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            })

            items = jobs.map(j => ({
                id: j.id,
                type: "face-swap",
                // Usar proxy URL em vez de base64 pesado
                resultUrl: `/api/face-swap/image/${j.id}`,
                status: j.status,
                createdAt: j.createdAt,
                details: "Face Swap"
            }))
        }
        else if (type === "upscale") {
            const upscales = await prisma.imageUpscale.findMany({
                where: {
                    userId: user.id,
                    status: { in: ["completed", "COMPLETED"] },
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            })

            items = upscales.map(u => ({
                id: u.id,
                type: "upscale",
                // Tenta usar proxy se não tiver URL externa (compatibilidade)
                resultUrl: u.resultUrl && u.resultUrl.startsWith("http")
                    ? u.resultUrl
                    : `/api/upscale-image/image/${u.id}`,
                status: u.status,
                createdAt: u.createdAt,
                details: `Upscale ${u.scale || "2x"}`
            }))
        }

        return NextResponse.json({ items })

    } catch (error) {
        console.error("Erro ao buscar histórico:", error)
        return NextResponse.json(
            { error: "Erro ao buscar histórico." },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get("id")
        const type = searchParams.get("type")

        if (!id || !type) {
            return NextResponse.json({ error: "ID e tipo são obrigatórios" }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !supabaseUser?.email) {
            return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: supabaseUser.email },
            select: { id: true },
        })

        if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
        }

        if (type === "generations") {
            await prisma.generation.deleteMany({
                where: { id: id, userId: user.id }
            })
        }
        else if (type === "face-swap") {
            await prisma.faceSwapJob.deleteMany({
                where: { id: id, userId: user.id }
            })
        }
        else if (type === "upscale") {
            await prisma.imageUpscale.deleteMany({
                where: { id: id, userId: user.id }
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Erro ao apagar item:", error)
        return NextResponse.json(
            { error: "Erro ao apagar item." },
            { status: 500 }
        )
    }
}
