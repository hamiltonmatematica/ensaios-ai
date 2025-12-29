import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "h9fyw7xb7dagyu"

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
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { credits: true },
        })

        if (!user || user.credits < 1) {
            return NextResponse.json(
                { error: "Créditos insuficientes.", required: 1, available: user?.credits || 0 },
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
        console.log("API Key completa:", RUNPOD_API_KEY)
        console.log("API Key length:", RUNPOD_API_KEY?.length)

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
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod Status:", runpodResponse.status)
            console.error("Erro RunPod Body:", errorData)

            await prisma.faceSwapJob.update({
                where: { id: job.id },
                data: {
                    status: "FAILED",
                    errorMessage: "Erro ao conectar com serviço de processamento"
                },
            })

            return NextResponse.json(
                { error: "Erro ao iniciar processamento." },
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
