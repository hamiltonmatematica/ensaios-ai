import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_FLUX_ENDPOINT_ID = process.env.RUNPOD_FLUX_ENDPOINT_ID

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
        const generation = await prisma.imageGeneration.findUnique({
            where: { id: jobId },
        })

        if (!generation) {
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        // Verificar se pertence ao usuário
        if (generation.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Acesso negado" },
                { status: 403 }
            )
        }

        // Se já completou, retornar resultado
        if (generation.status === "completed" && generation.resultUrl) {
            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: generation.resultUrl,
            })
        }

        // Se falhou, retornar erro
        if (generation.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: "Falha na geração",
            })
        }

        // Consultar RunPod
        if (!generation.runpodJobId || !RUNPOD_FLUX_ENDPOINT_ID) {
            return NextResponse.json({
                status: generation.status,
            })
        }

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_FLUX_ENDPOINT_ID}/status/${generation.runpodJobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!runpodResponse.ok) {
            console.error("Erro ao consultar status RunPod")
            return NextResponse.json({
                status: generation.status,
            })
        }

        const runpodData = await runpodResponse.json()

        // Processar resposta do RunPod
        if (runpodData.status === "COMPLETED") {
            // Extrair URL da imagem do output
            let resultUrl = null

            if (runpodData.output) {
                if (typeof runpodData.output === "string") {
                    resultUrl = runpodData.output
                } else if (runpodData.output.image) {
                    resultUrl = runpodData.output.image
                } else if (runpodData.output.images && runpodData.output.images[0]) {
                    resultUrl = runpodData.output.images[0]
                } else if (runpodData.output.image_url) {
                    resultUrl = runpodData.output.image_url
                }
            }

            // Atualizar banco
            await prisma.imageGeneration.update({
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
                    credits: { decrement: generation.creditsUsed },
                },
            })

            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: resultUrl,
            })

        } else if (runpodData.status === "FAILED") {
            await prisma.imageGeneration.update({
                where: { id: jobId },
                data: { status: "failed" },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro na geração",
            })
        }

        // Ainda processando
        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        console.error("Erro ao verificar status:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status" },
            { status: 500 }
        )
    }
}
