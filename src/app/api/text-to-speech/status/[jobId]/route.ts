import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_TTS_ENDPOINT_ID = process.env.RUNPOD_TTS_ENDPOINT_ID

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
        const ttsJob = await prisma.textToSpeech.findUnique({
            where: { id: jobId },
        })

        if (!ttsJob) {
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        // Verificar se pertence ao usuário
        if (ttsJob.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Acesso negado" },
                { status: 403 }
            )
        }

        // Se já completou, retornar resultado
        if (ttsJob.status === "completed" && ttsJob.audioUrl) {
            return NextResponse.json({
                status: "COMPLETED",
                audioUrl: ttsJob.audioUrl,
                duration: ttsJob.duration,
            })
        }

        // Se falhou
        if (ttsJob.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: "Falha na síntese de voz",
            })
        }

        // Consultar RunPod
        if (!ttsJob.runpodJobId || !RUNPOD_TTS_ENDPOINT_ID) {
            return NextResponse.json({
                status: ttsJob.status,
            })
        }

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_TTS_ENDPOINT_ID}/status/${ttsJob.runpodJobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!runpodResponse.ok) {
            console.error("Erro ao consultar status RunPod TTS")
            return NextResponse.json({
                status: ttsJob.status,
            })
        }

        const runpodData = await runpodResponse.json()

        // Processar resposta
        if (runpodData.status === "COMPLETED") {
            let audioUrl = null
            let duration = null

            if (runpodData.output) {
                if (typeof runpodData.output === "string") {
                    audioUrl = runpodData.output
                } else if (runpodData.output.audio) {
                    audioUrl = runpodData.output.audio
                } else if (runpodData.output.audio_url) {
                    audioUrl = runpodData.output.audio_url
                } else if (runpodData.output.url) {
                    audioUrl = runpodData.output.url
                }

                if (runpodData.output.duration) {
                    duration = runpodData.output.duration
                }
            }

            // Atualizar banco
            await prisma.textToSpeech.update({
                where: { id: jobId },
                data: {
                    status: "completed",
                    audioUrl: audioUrl,
                    duration: duration ? Math.round(duration) : null,
                },
            })

            // Deduzir créditos
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    credits: { decrement: ttsJob.creditsUsed },
                },
            })

            return NextResponse.json({
                status: "COMPLETED",
                audioUrl: audioUrl,
                duration: duration,
            })

        } else if (runpodData.status === "FAILED") {
            await prisma.textToSpeech.update({
                where: { id: jobId },
                data: { status: "failed" },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro na síntese",
            })
        }

        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        console.error("Erro ao verificar status TTS:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status" },
            { status: 500 }
        )
    }
}
