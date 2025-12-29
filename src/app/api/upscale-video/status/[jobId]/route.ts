import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_VIDEO_UPSCALE_ID = process.env.RUNPOD_VIDEO_UPSCALE_ENDPOINT_ID || process.env.RUNPOD_UPSCALER_ID

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Não autorizado" },
                { status: 401 }
            )
        }

        const { jobId } = await params

        // Buscar job no banco
        const upscaleJob = await prisma.videoUpscale.findUnique({
            where: { id: jobId },
        })

        if (!upscaleJob) {
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        // Verificar se pertence ao usuário
        if (upscaleJob.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Acesso negado" },
                { status: 403 }
            )
        }

        // Se já completou
        if (upscaleJob.status === "completed" && upscaleJob.resultUrl) {
            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: upscaleJob.resultUrl,
            })
        }

        // Se falhou
        if (upscaleJob.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: "Falha no upscale de vídeo",
            })
        }

        // Consultar RunPod
        if (!upscaleJob.runpodJobId || !RUNPOD_VIDEO_UPSCALE_ID) {
            return NextResponse.json({
                status: upscaleJob.status,
            })
        }

        const runpodResponse = await fetch(
            `https://api.runpod.io/v2/${RUNPOD_VIDEO_UPSCALE_ID}/status/${upscaleJob.runpodJobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!runpodResponse.ok) {
            console.error("Erro ao consultar status RunPod Video Upscale")
            return NextResponse.json({
                status: upscaleJob.status,
            })
        }

        const runpodData = await runpodResponse.json()

        if (runpodData.status === "COMPLETED") {
            let resultUrl = null

            if (runpodData.output) {
                if (typeof runpodData.output === "string") {
                    resultUrl = runpodData.output
                } else if (runpodData.output.video) {
                    resultUrl = runpodData.output.video
                } else if (runpodData.output.video_url) {
                    resultUrl = runpodData.output.video_url
                } else if (runpodData.output.url) {
                    resultUrl = runpodData.output.url
                }
            }

            // Atualizar banco
            await prisma.videoUpscale.update({
                where: { id: jobId },
                data: {
                    status: "completed",
                    resultUrl: resultUrl,
                },
            })

            // Deduzir créditos
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    credits: { decrement: upscaleJob.creditsUsed },
                },
            })

            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: resultUrl,
            })

        } else if (runpodData.status === "FAILED") {
            await prisma.videoUpscale.update({
                where: { id: jobId },
                data: { status: "failed" },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro no upscale de vídeo",
            })
        }

        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        console.error("Erro ao verificar status video upscale:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status" },
            { status: 500 }
        )
    }
}
