import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
    handleRunPodError,
    logRunPodOperation,
    parseRunPodOutput,
    ensureBase64Prefix
} from "@/lib/runpod-error-handler"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_FLUX_ENDPOINT_ID = process.env.RUNPOD_FLUX_ENDPOINT_ID
const CREDITS_COST = 35

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

        const artJob = await prisma.artEffect.findUnique({
            where: { id: jobId },
        })

        if (!artJob) {
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        if (artJob.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Não autorizado" },
                { status: 403 }
            )
        }

        // If already completed, return cached result
        if (artJob.status === "completed" && artJob.resultUrl) {
            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: artJob.resultUrl,
            })
        }

        if (artJob.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: artJob.errorMessage || "Falha no processamento",
            })
        }

        // If still processing, check RunPod status
        if (artJob.runpodJobId) {
            const runpodResponse = await fetch(
                `https://api.runpod.ai/v2/${RUNPOD_FLUX_ENDPOINT_ID}/status/${artJob.runpodJobId}`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    },
                }
            )

            if (!runpodResponse.ok) {
                const errorBody = await runpodResponse.text()

                logRunPodOperation("art-effects-status-error", {
                    endpoint: RUNPOD_FLUX_ENDPOINT_ID,
                    status: runpodResponse.status,
                    jobId: artJob.id
                })

                // Return current status from DB if can't check RunPod
                return NextResponse.json({
                    status: artJob.status,
                })
            }

            const runpodData = await runpodResponse.json()

            // Handle COMPLETED status
            if (runpodData.status === "COMPLETED") {
                // Parse output with multiple format support
                const resultUrl = parseRunPodOutput(runpodData.output)

                if (resultUrl) {
                    // Ensure base64 prefix if needed
                    const finalUrl = resultUrl.startsWith('http')
                        ? resultUrl
                        : ensureBase64Prefix(resultUrl)

                    // Update database
                    await prisma.artEffect.update({
                        where: { id: artJob.id },
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

                    logRunPodOperation("art-effects-completed", {
                        endpoint: RUNPOD_FLUX_ENDPOINT_ID,
                        jobId: artJob.id
                    })

                    return NextResponse.json({
                        status: "COMPLETED",
                        resultUrl: finalUrl,
                    })
                } else {
                    // Completed but no valid output
                    await prisma.artEffect.update({
                        where: { id: artJob.id },
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
            }

            // Handle FAILED status
            else if (runpodData.status === "FAILED") {
                const errorMessage = runpodData.error || "Erro no processamento"

                await prisma.artEffect.update({
                    where: { id: artJob.id },
                    data: {
                        status: "failed",
                        errorMessage
                    },
                })

                logRunPodOperation("art-effects-failed", {
                    endpoint: RUNPOD_FLUX_ENDPOINT_ID,
                    jobId: artJob.id,
                    error: errorMessage
                })

                return NextResponse.json({
                    status: "FAILED",
                    error: errorMessage,
                })
            }

            // Still processing
            return NextResponse.json({
                status: runpodData.status || "IN_QUEUE",
            })
        }

        return NextResponse.json({
            status: artJob.status,
        })

    } catch (error) {
        logRunPodOperation("art-effects-status-exception", {
            error: error instanceof Error ? error.message : "Unknown error"
        })

        return NextResponse.json(
            { error: "Erro interno ao verificar status" },
            { status: 500 }
        )
    }
}

