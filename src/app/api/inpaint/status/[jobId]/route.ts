import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_COMFYUI_ID = process.env.RUNPOD_COMFYUI_ID || process.env.RUNPOD_FLUX_ENDPOINT_ID

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
        const inpaintJob = await prisma.inpaint.findUnique({
            where: { id: jobId },
        })

        if (!inpaintJob) {
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        // Verificar se pertence ao usuário
        if (inpaintJob.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Acesso negado" },
                { status: 403 }
            )
        }

        // Se já completou
        if (inpaintJob.status === "completed" && inpaintJob.resultUrl) {
            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: inpaintJob.resultUrl,
            })
        }

        // Se falhou
        if (inpaintJob.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: "Falha no inpaint",
            })
        }

        // Consultar RunPod
        if (!inpaintJob.runpodJobId || !RUNPOD_COMFYUI_ID) {
            return NextResponse.json({
                status: inpaintJob.status,
            })
        }

        const runpodResponse = await fetch(
            `https://api.runpod.io/v2/${RUNPOD_COMFYUI_ID}/status/${inpaintJob.runpodJobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!runpodResponse.ok) {
            console.error("Erro ao consultar status RunPod Inpaint")
            return NextResponse.json({
                status: inpaintJob.status,
            })
        }

        const runpodData = await runpodResponse.json()

        if (runpodData.status === "COMPLETED") {
            let resultUrl = null

            if (runpodData.output) {
                if (typeof runpodData.output === "string") {
                    if (!runpodData.output.startsWith("http")) {
                        resultUrl = `data:image/png;base64,${runpodData.output}`
                    } else {
                        resultUrl = runpodData.output
                    }
                } else if (runpodData.output.images && runpodData.output.images[0]) {
                    resultUrl = runpodData.output.images[0]
                } else if (runpodData.output.image) {
                    resultUrl = runpodData.output.image
                }
            }

            // Atualizar banco
            await prisma.inpaint.update({
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
                    credits: { decrement: inpaintJob.creditsUsed },
                },
            })

            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: resultUrl,
            })

        } else if (runpodData.status === "FAILED") {
            await prisma.inpaint.update({
                where: { id: jobId },
                data: { status: "failed" },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro no inpaint",
            })
        }

        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        console.error("Erro ao verificar status inpaint:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status" },
            { status: 500 }
        )
    }
}
