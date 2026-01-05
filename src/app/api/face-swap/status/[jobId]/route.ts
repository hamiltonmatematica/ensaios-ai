import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const COST_CREDITS = 5
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "h9fyw7xb7dagyu"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params

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
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        // Se já completou ou falhou, retornar status direto
        if (job.status === "COMPLETED" && job.resultImage) {
            const imageUrl = `/api/face-swap/image/${jobId}`
            return NextResponse.json({
                status: job.status,
                resultImage: imageUrl,
                error: job.errorMessage,
            })
        }

        if (job.status === "FAILED") {
            return NextResponse.json({
                status: job.status,
                error: job.errorMessage || "Erro no processamento",
            })
        }

        // Consultar RunPod se tiver jobId
        if (!job.jobId || !RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
            console.log("[Face Swap Status] Missing config - jobId:", job.jobId, "API Key:", !!RUNPOD_API_KEY, "Endpoint:", RUNPOD_ENDPOINT_ID)
            return NextResponse.json({
                status: job.status,
            })
        }

        console.log("[Face Swap Status] Querying RunPod for job:", job.jobId)

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${job.jobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        console.log("[Face Swap Status] RunPod response status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            console.error("Erro ao consultar status RunPod Face Swap")
            return NextResponse.json({
                status: job.status,
            })
        }

        const runpodData = await runpodResponse.json()
        console.log("[Face Swap Status] RunPod data:", JSON.stringify(runpodData, null, 2))

        // Se completou com sucesso
        if (runpodData.status === "COMPLETED") {
            let resultImage = runpodData.output?.image || runpodData.output

            // Garantir que está em formato base64
            if (resultImage && typeof resultImage === "string" && !resultImage.startsWith("data:")) {
                resultImage = `data:image/png;base64,${resultImage}`
            }

            // Atualizar job no banco
            await prisma.faceSwapJob.update({
                where: { id: jobId },
                data: {
                    status: "COMPLETED",
                    resultImage: resultImage,
                },
            })

            // Debitar créditos
            try {
                await CreditService.consumeCredits(
                    dbUser.id,
                    COST_CREDITS,
                    "FACE_SWAP"
                )
            } catch (error) {
                console.error("Erro ao debitar créditos (Face Swap):", error)
                // Não falha a operação se o débito falhar
            }

            const imageUrl = `/api/face-swap/image/${jobId}`

            return NextResponse.json({
                status: "COMPLETED",
                resultImage: imageUrl,
            })

        } else if (runpodData.status === "FAILED") {
            // Atualizar como falha
            await prisma.faceSwapJob.update({
                where: { id: jobId },
                data: {
                    status: "FAILED",
                    errorMessage: runpodData.error || "Erro no processamento"
                },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro no processamento",
            })
        }

        // Ainda em progresso - retornar status do RunPod
        console.log("[Face Swap Status] Job still in progress, status:", runpodData.status)
        return NextResponse.json({
            status: runpodData.status || "IN_PROGRESS",
            message: runpodData.status === "IN_QUEUE" ? "Na fila de processamento..." : "Processando..."
        })

    } catch (error) {
        console.error("Erro ao verificar status:", error)
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
        return NextResponse.json(
            { error: `Erro ao verificar status: ${errorMessage}` },
            { status: 500 }
        )
    }
}
