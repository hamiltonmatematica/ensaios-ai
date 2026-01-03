import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "eyoku6bop62rtq"

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
        const upscaleJob = await prisma.imageUpscale.findUnique({
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
            console.error("Erro ao consultar status RunPod Upscaler")
            return NextResponse.json({
                status: upscaleJob.status,
            })
        }

        const runpodData = await runpodResponse.json()

        console.log("[UPSCALE STATUS] RunPod response:", JSON.stringify(runpodData, null, 2))

        if (runpodData.status === "COMPLETED") {
            // Extrai resultado - pode vir como output.output ou output diretamente (igual ao face-swap)
            let resultUrl = runpodData.output?.output || runpodData.output

            console.log("[UPSCALE STATUS] Raw output type:", typeof resultUrl)
            console.log("[UPSCALE STATUS] Raw output (first 100 chars):", typeof resultUrl === 'string' ? resultUrl.substring(0, 100) : resultUrl)

            // Se for objeto com image ou image_base64, pega o valor
            if (typeof resultUrl === "object" && resultUrl !== null) {
                if (resultUrl.image) {
                    resultUrl = resultUrl.image
                } else if (resultUrl.image_base64) {
                    resultUrl = resultUrl.image_base64
                } else {
                    console.error("[UPSCALE STATUS] Output is object but has no expected field. Keys:", Object.keys(resultUrl))
                }
            }

            // Adiciona prefixo base64 se necessário
            if (resultUrl && typeof resultUrl === "string" && !resultUrl.startsWith("data:") && !resultUrl.startsWith("http")) {
                resultUrl = `data:image/png;base64,${resultUrl}`
            }

            console.log("[UPSCALE STATUS] Final resultUrl:", resultUrl?.substring(0, 100))

            // Atualizar banco
            await prisma.imageUpscale.update({
                where: { id: jobId },
                data: {
                    status: "completed",
                    resultUrl: resultUrl,
                },
            })

            // Deduzir créditos usando CreditService
            try {
                await CreditService.consumeCredits(
                    session.user.id,
                    upscaleJob.creditsUsed,
                    `UPSCALE_${upscaleJob.scale}`
                )
            } catch (error) {
                console.error("Erro ao debitar créditos (Upscale):", error)
                // Não falha o job, mas loga erro crítico
            }

            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: resultUrl,
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
