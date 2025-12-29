import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_SADTALKER_ID = process.env.RUNPOD_SADTALKER_ENDPOINT_ID || process.env.RUNPOD_AVATAR_ENDPOINT_ID

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
        const avatarJob = await prisma.avatarGeneration.findUnique({
            where: { id: jobId },
        })

        if (!avatarJob) {
            return NextResponse.json(
                { error: "Job não encontrado" },
                { status: 404 }
            )
        }

        // Verificar se pertence ao usuário
        if (avatarJob.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Acesso negado" },
                { status: 403 }
            )
        }

        // Se já completou
        if (avatarJob.status === "completed" && avatarJob.resultUrl) {
            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: avatarJob.resultUrl,
            })
        }

        // Se falhou
        if (avatarJob.status === "failed") {
            return NextResponse.json({
                status: "FAILED",
                error: "Falha na geração do avatar",
            })
        }

        // Consultar RunPod
        if (!avatarJob.runpodJobId || !RUNPOD_SADTALKER_ID) {
            return NextResponse.json({
                status: avatarJob.status,
            })
        }

        const runpodResponse = await fetch(
            `https://api.runpod.io/v2/${RUNPOD_SADTALKER_ID}/status/${avatarJob.runpodJobId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        if (!runpodResponse.ok) {
            console.error("Erro ao consultar status RunPod SadTalker")
            return NextResponse.json({
                status: avatarJob.status,
            })
        }

        const runpodData = await runpodResponse.json()

        if (runpodData.status === "COMPLETED") {
            let resultUrl = null

            if (runpodData.output) {
                if (typeof runpodData.output === "string") {
                    resultUrl = runpodData.output
                } else if (runpodData.output.output_video_url) {
                    resultUrl = runpodData.output.output_video_url
                } else if (runpodData.output.video) {
                    resultUrl = runpodData.output.video
                } else if (runpodData.output.url) {
                    resultUrl = runpodData.output.url
                }
            }

            // Atualizar banco
            await prisma.avatarGeneration.update({
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
                    credits: { decrement: avatarJob.creditsUsed },
                },
            })

            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: resultUrl,
            })

        } else if (runpodData.status === "FAILED") {
            await prisma.avatarGeneration.update({
                where: { id: jobId },
                data: { status: "failed" },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro na geração do avatar",
            })
        }

        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        console.error("Erro ao verificar status avatar:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status" },
            { status: 500 }
        )
    }
}
