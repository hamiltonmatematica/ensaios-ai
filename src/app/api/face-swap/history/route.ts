import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
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

        // Busca últimos 10 jobs completados do usuário
        const jobs = await prisma.faceSwapJob.findMany({
            where: {
                userId: dbUser.id,
                status: "COMPLETED",
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 10,
            select: {
                id: true,
                createdAt: true,
            },
        })

        const jobsWithUrl = jobs.map(job => ({
            id: job.id,
            resultImage: `/api/face-swap/image/${job.id}`,
            createdAt: job.createdAt
        }))

        return NextResponse.json(jobsWithUrl)

    } catch (error) {
        console.error("Erro ao buscar histórico:", error)
        return NextResponse.json({ error: "Erro ao buscar histórico." }, { status: 500 })
    }
}
