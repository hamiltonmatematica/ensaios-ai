import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import {
    logRunPodOperation,
    parseRunPodOutput,
    ensureBase64Prefix
} from "@/lib/runpod-error-handler"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_VIRTUAL_TRY_ON_ID = process.env.RUNPOD_VIRTUAL_TRY_ON_ID // Use .env value
const CREDITS_COST = 20

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
        const tryOnJob = await prisma.virtualTryOn.findUnique({
            where: { id: jobId },
        })

        if (!tryOnJob) {
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        // Verificar se pertence ao usuário
        if (tryOnJob.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Acesso negado" },
                { status: 403 }
            )
        }

        // Se já completou
        if (tryOnJob.status === "completed" && tryOnJob.resultUrl) {
            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: tryOnJob.resultUrl,
            })
        }

        // Se falhou
        if (tryOnJob.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: "Falha no provador virtual",
            })
        }

        // Consultar RunPod
        if (!tryOnJob.runpodJobId) {
            return NextResponse.json({
                status: tryOnJob.status,
            })
        }

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_VIRTUAL_TRY_ON_ID}/status/${tryOnJob.runpodJobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!runpodResponse.ok) {
            logRunPodOperation("virtual-try-on-status-error", {
                endpoint: RUNPOD_VIRTUAL_TRY_ON_ID,
                status: runpodResponse.status,
                jobId: tryOnJob.id
            })

            return NextResponse.json({
                status: tryOnJob.status,
            })
        }

        const runpodData = await runpodResponse.json()

        if (runpodData.status === "COMPLETED") {
            // Parse output with multiple format support
            const resultUrl = parseRunPodOutput(runpodData.output)

            if (resultUrl) {
                // Ensure base64 prefix if needed
                const finalUrl = resultUrl.startsWith('http')
                    ? resultUrl
                    : ensureBase64Prefix(resultUrl)

                // Update database
                await prisma.virtualTryOn.update({
                    where: { id: jobId },
                    data: {
                        status: "completed",
                        resultUrl: finalUrl,
                    },
                })

                // Deduct credits only on successful completion
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { credits: { decrement: CREDITS_COST } },
                })

                logRunPodOperation("virtual-try-on-completed", {
                    endpoint: RUNPOD_VIRTUAL_TRY_ON_ID,
                    jobId: tryOnJob.id
                })

                return NextResponse.json({
                    status: "COMPLETED",
                    resultUrl: finalUrl,
                })
            } else {
                // Completed but no valid output
                await prisma.virtualTryOn.update({
                    where: { id: jobId },
                    data: {
                        status: "failed",
                        errorMessage: "Resultado inválido do processamento"
                    },
                })

                return NextResponse.json({
                    status: "FAILED",
                    error: "Resultado inválido do processamento",
                })
            }

        } else if (runpodData.status === "FAILED") {
            const errorMessage = runpodData.error || "Erro no provador virtual"

            await prisma.virtualTryOn.update({
                where: { id: jobId },
                data: {
                    status: "failed",
                    errorMessage
                },
            })

            logRunPodOperation("virtual-try-on-failed", {
                endpoint: RUNPOD_VIRTUAL_TRY_ON_ID,
                jobId: tryOnJob.id,
                error: errorMessage
            })

            return NextResponse.json({
                status: "FAILED",
                error: errorMessage,
            })
        }

        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        logRunPodOperation("virtual-try-on-status-exception", {
            error: error instanceof Error ? error.message : "Unknown error"
        })

        return NextResponse.json(
            { error: "Erro interno ao verificar status" },
            { status: 500 }
        )
    }
}
