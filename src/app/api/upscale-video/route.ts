import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_VIDEO_UPSCALE_ID = process.env.RUNPOD_VIDEO_UPSCALE_ENDPOINT_ID || process.env.RUNPOD_UPSCALER_ID

// Créditos por escala
const CREDITS_BY_SCALE: Record<string, number> = {
    "2x": 50,
    "4x": 100,
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

        if (!RUNPOD_API_KEY || !RUNPOD_VIDEO_UPSCALE_ID) {
            console.error("RUNPOD_API_KEY ou RUNPOD_VIDEO_UPSCALE_ID não configurados")
            return NextResponse.json(
                { error: "Configuração de API incompleta." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { video, scale } = body

        if (!video) {
            return NextResponse.json(
                { error: "Vídeo é obrigatório." },
                { status: 400 }
            )
        }

        const creditsRequired = CREDITS_BY_SCALE[scale] || 100

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
        const cleanVideo = video.includes(',') ? video.split(',')[1] : video

        // Criar registro no banco
        const upscaleJob = await prisma.videoUpscale.create({
            data: {
                userId: session.user.id,
                videoUrl: "[base64 video]",
                resolution: scale === "4x" ? "1080p→4K" : "720p→1080p",
                duration: 0, // Será atualizado depois
                creditsUsed: creditsRequired,
                status: "pending",
            },
        })

        // Chamar API RunPod
        console.log("Chamando RunPod Video Upscale:", RUNPOD_VIDEO_UPSCALE_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_VIDEO_UPSCALE_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        video: cleanVideo,
                        scale: scale === "4x" ? 4 : 2,
                    },
                }),
            }
        )

        console.log("RunPod Video Upscale Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod Video Upscale:", errorData)

            await prisma.videoUpscale.update({
                where: { id: upscaleJob.id },
                data: { status: "failed" },
            })

            return NextResponse.json(
                { error: "Erro ao iniciar upscale de vídeo." },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualizar com ID do RunPod
        await prisma.videoUpscale.update({
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
        console.error("Erro no video upscale:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
