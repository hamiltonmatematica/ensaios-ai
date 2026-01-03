import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { NextRequest, NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "h9fyw7xb7dagyu"

const COST_CREDITS = 5

export async function POST(request: NextRequest) {
    try {
        // Verifica autenticação
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        // Verifica configuração da API
        if (!RUNPOD_API_KEY) {
            console.error("RUNPOD_API_KEY não configurada")
            return NextResponse.json(
                { error: "Configuração de API incompleta." },
                { status: 500 }
            )
        }

        // Parse do body
        const body = await request.json()
        const { sourceImage, targetImage } = body

        // Validações
        if (!sourceImage || !targetImage) {
            return NextResponse.json(
                { error: "Envie as duas imagens para continuar." },
                { status: 400 }
            )
        }

        // Verifica créditos
        try {
            await CreditService.assertUserHasCredits(session.user.id, COST_CREDITS)
        } catch (e) {
            // Busca saldo atual para mensagem de erro
            const balance = await CreditService.getBalance(session.user.id)
            return NextResponse.json(
                { error: "Créditos insuficientes.", required: COST_CREDITS, available: balance.totalCredits },
                { status: 402 }
            )
        }

        // Remove prefixo data:image se existir para enviar ao RunPod
        const cleanSourceImage = sourceImage.replace(/^data:image\/[a-z]+;base64,/, "")
        const cleanTargetImage = targetImage.replace(/^data:image\/[a-z]+;base64,/, "")

        // Cria registro no banco
        const job = await prisma.faceSwapJob.create({
            data: {
                userId: session.user.id,
                status: "PENDING",
                sourceImage: sourceImage, // Mantém o original com prefixo para exibição
                targetImage: targetImage,
            },
        })

        // Chama API RunPod
        console.log("Chamando RunPod com endpoint:", RUNPOD_ENDPOINT_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        source_image: cleanSourceImage,
                        target_image: cleanTargetImage,
                    },
                }),
            }
        )

        console.log("RunPod Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            let errorMessage = "Erro ao conectar com serviço de processamento"
            let errorData: any

            try {
                // Tenta fazer parse como JSON
                const contentType = runpodResponse.headers.get("content-type")
                if (contentType && contentType.includes("application/json")) {
                    errorData = await runpodResponse.json()
                    errorMessage = errorData.error || errorMessage
                } else {
                    // Se não for JSON, pega como texto
                    errorData = await runpodResponse.text()
                }

                console.error("Erro RunPod Status:", runpodResponse.status)
                console.error("Erro RunPod Body:", errorData)

                // Identifica erro de tamanho de arquivo
                if (typeof errorData === 'string' && errorData.includes("max body size")) {
                    errorMessage = "Imagem muito grande. Tente com uma imagem menor."
                } else if (errorData?.error?.includes("max body size")) {
                    errorMessage = "Imagem muito grande. Tente com uma imagem menor."
                }
            } catch (parseError) {
                console.error("Erro ao fazer parse da resposta:", parseError)
            }

            await prisma.faceSwapJob.update({
                where: { id: job.id },
                data: {
                    status: "FAILED",
                    errorMessage
                },
            })

            return NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualiza job com ID do RunPod
        await prisma.faceSwapJob.update({
            where: { id: job.id },
            data: {
                jobId: runpodData.id,
                status: "IN_PROGRESS",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: job.id,
            runpodJobId: runpodData.id,
            status: runpodData.status,
        })

    } catch (error) {
        console.error("Erro no Face Swap:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
