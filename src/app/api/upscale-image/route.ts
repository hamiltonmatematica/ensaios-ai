import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_UPSCALER_ID = process.env.RUNPOD_UPSCALER_ID || process.env.RUNPOD_UPSCALE_ENDPOINT_ID

// Créditos por escala
const CREDITS_BY_SCALE: Record<string, number> = {
    "2x": 10,
    "4x": 20,
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        if (!RUNPOD_API_KEY || !RUNPOD_UPSCALER_ID) {
            console.error("RUNPOD_API_KEY ou RUNPOD_UPSCALER_ID não configurados")
            return NextResponse.json(
                { error: "Configuração de API incompleta." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { image, scale } = body

        if (!image) {
            return NextResponse.json(
                { error: "Imagem é obrigatória." },
                { status: 400 }
            )
        }

        const creditsRequired = CREDITS_BY_SCALE[scale] || 20

        // Verificar créditos
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { credits: true },
        })

        if (!user || user.credits < creditsRequired) {
            return NextResponse.json(
                { error: "Créditos insuficientes.", required: creditsRequired, available: user?.credits || 0 },
                { status: 402 }
            )
        }

        // Limpar base64
        const cleanImage = image.includes(',') ? image.split(',')[1] : image

        // Criar registro no banco
        const upscaleJob = await prisma.imageUpscale.create({
            data: {
                userId: session.user.id,
                imageUrl: image.substring(0, 100) + "...", // Salva preview do base64
                scale: scale || "4x",
                creditsUsed: creditsRequired,
                status: "pending",
            },
        })

        // Chamar API RunPod (Upscaler)
        console.log("Chamando RunPod Upscaler:", RUNPOD_UPSCALER_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.io/v2/${RUNPOD_UPSCALER_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        image: cleanImage,
                        scale: scale === "4x" ? 4 : 2,
                    },
                }),
            }
        )

        console.log("RunPod Upscaler Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod Upscaler:", errorData)

            await prisma.imageUpscale.update({
                where: { id: upscaleJob.id },
                data: { status: "failed" },
            })

            return NextResponse.json(
                { error: "Erro ao iniciar upscale." },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualizar com ID do RunPod
        await prisma.imageUpscale.update({
            where: { id: upscaleJob.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: upscaleJob.id,
            runpodJobId: runpodData.id,
            status: runpodData.status,
        })

    } catch (error) {
        console.error("Erro no upscale:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
