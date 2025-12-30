import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_VIRTUAL_TRY_ON_ID = "a71bxqwgd57jzz"

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
            console.error("Erro ao consultar status RunPod Try-On")
            return NextResponse.json({
                status: tryOnJob.status,
            })
        }

        const runpodData = await runpodResponse.json()

        if (runpodData.status === "COMPLETED") {
            let resultUrl = null

            if (runpodData.output) {
                if (runpodData.output.output_url) {
                    resultUrl = runpodData.output.output_url
                } else if (runpodData.output.image) {
                    // Se vier base64
                    resultUrl = `data:image/png;base64,${runpodData.output.image}`
                } else if (typeof runpodData.output === "string" && runpodData.output.startsWith("http")) {
                    resultUrl = runpodData.output
                }
            }

            // Atualizar banco
            await prisma.virtualTryOn.update({
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
                    credits: { decrement: tryOnJob.creditsUsed },
                },
            })

            return NextResponse.json({
                status: "COMPLETED",
                resultUrl: resultUrl,
            })

        } else if (runpodData.status === "FAILED") {
            await prisma.virtualTryOn.update({
                where: { id: jobId },
                data: { status: "failed" },
            })

            return NextResponse.json({
                status: "FAILED",
                error: runpodData.error || "Erro no provador virtual",
            })
        }

        return NextResponse.json({
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        console.error("Erro ao verificar status try-on:", error)
        return NextResponse.json(
            { error: "Erro ao verificar status" },
            { status: 500 }
        )
    }
}
