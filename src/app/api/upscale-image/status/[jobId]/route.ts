import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "qqx0my03hxzi5k"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
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

        const { jobId } = await params

        // Buscar job no banco
        const upscaleJob = await prisma.imageUpscale.findUnique({
            where: { id: jobId },
        })

        if (!upscaleJob) {
            return NextResponse.json({ error: "Job não encontrado" }, { status: 404 })
        }

        // Verificar se pertence ao usuário
        if (upscaleJob.userId !== dbUser.id) {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
        }

        // Se já completou
        if (upscaleJob.status === "completed" && upscaleJob.resultUrl) {
            // Retornar URL do proxy
            const imageUrl = `/api/upscale-image/image/${jobId}`
            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: imageUrl,
            })
        }

        // Se falhou
        if (upscaleJob.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: "Falha no upscale",
            })
        }

        // Consultar RunPod
        if (!upscaleJob.runpodJobId || !RUNPOD_UPSCALE_ENDPOINT_ID) {
            return NextResponse.json({
                status: upscaleJob.status,
            })
        }

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/status/${upscaleJob.runpodJobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!runpodResponse.ok) {
            const errorText = await runpodResponse.text()
            console.error(`Erro ao consultar status RunPod Upscaler: ${runpodResponse.status} ${runpodResponse.statusText} - Body: ${errorText}`)
            return NextResponse.json({
                status: upscaleJob.status,
                error: `RunPod Error: ${runpodResponse.status}`,
            })
        }

        const runpodData = await runpodResponse.json()

        if (runpodData.status === "COMPLETED") {
            let resultUrl = runpodData.output?.output || runpodData.output

            if (typeof resultUrl === "object" && resultUrl !== null) {
                if (resultUrl.image) {
                    resultUrl = resultUrl.image
                } else if (resultUrl.image_base64) {
                    resultUrl = resultUrl.image_base64
                }
            }

            if (resultUrl && typeof resultUrl === "string" && !resultUrl.startsWith("data:") && !resultUrl.startsWith("http")) {
                resultUrl = `data:image/png;base64,${resultUrl}`
            }

            await prisma.imageUpscale.update({
                where: { id: jobId },
                data: {
                    status: "completed",
                    resultUrl: resultUrl,
                },
            })

            try {
                await CreditService.consumeCredits(
                    dbUser.id,
                    upscaleJob.creditsUsed,
                    `UPSCALE_${upscaleJob.scale}`
                )
            } catch (error) {
                console.error("Erro ao debitar créditos (Upscale):", error)
            }

            // Retornar URL do proxy ao invés do base64 completo
            const imageUrl = `/api/upscale-image/image/${jobId}`

            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: imageUrl,
            })

        } else if (runpodData.status === "FAILED") {
            await prisma.imageUpscale.update({
                where: { id: jobId },
                data: { status: "failed" },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro no upscale",
            })
        }

        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        console.error("Erro ao verificar status upscale:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status" },
            { status: 500 }
        )
    }
}
