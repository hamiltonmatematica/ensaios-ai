import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "h9fyw7xb7dagyu"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params

        // Verifica autenticação
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        // Busca o job no banco
        const job = await prisma.faceSwapJob.findUnique({
            where: { id: jobId },
        })

        if (!job) {
            return NextResponse.json(
                { error: "Job não encontrado." },
                { status: 404 }
            )
        }

        // Verifica se pertence ao usuário
        if (job.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Acesso não autorizado." },
                { status: 403 }
            )
        }

        // Se já completou ou falhou, retorna do banco
        if (job.status === "COMPLETED" || job.status === "FAILED") {
            return NextResponse.json({
                status: job.status,
                resultImage: job.resultImage,
                error: job.errorMessage,
            })
        }

        // Consulta status no RunPod
        if (!job.jobId || !RUNPOD_API_KEY) {
            return NextResponse.json({
                status: job.status,
                error: "Configuração inválida",
            })
        }

        const statusResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${job.jobId}`,
            {
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!statusResponse.ok) {
            return NextResponse.json({
                status: job.status,
                error: "Erro ao consultar status",
            })
        }

        const statusData = await statusResponse.json()

        // Mapeia status do RunPod
        if (statusData.status === "COMPLETED") {
            // Extrai resultado - pode vir como output.output ou output diretamente
            let resultImage = statusData.output?.output || statusData.output

            // Se for objeto com image, pega o image
            if (typeof resultImage === "object" && resultImage.image) {
                resultImage = resultImage.image
            }

            // Adiciona prefixo base64 se necessário
            if (resultImage && !resultImage.startsWith("data:")) {
                resultImage = `data:image/png;base64,${resultImage}`
            }

            // Atualiza no banco
            await prisma.faceSwapJob.update({
                where: { id: jobId },
                data: {
                    status: "COMPLETED",
                    resultImage,
                },
            })

            // Deduz crédito
            await prisma.user.update({
                where: { id: session.user.id },
                data: { credits: { decrement: 1 } },
            })

            return NextResponse.json({
                status: "COMPLETED",
                resultImage,
            })

        } else if (statusData.status === "FAILED") {
            const errorMessage = statusData.error || statusData.output?.error || "Processamento falhou"

            await prisma.faceSwapJob.update({
                where: { id: jobId },
                data: {
                    status: "FAILED",
                    errorMessage,
                },
            })

            return NextResponse.json({
                status: "FAILED",
                error: errorMessage,
            })

        } else {
            // IN_QUEUE, IN_PROGRESS, etc.
            return NextResponse.json({
                status: statusData.status || "IN_PROGRESS",
            })
        }

    } catch (error) {
        console.error("Erro ao verificar status:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status." },
            { status: 500 }
        )
    }
}
