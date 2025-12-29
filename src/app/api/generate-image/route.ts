import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_FLUX_ENDPOINT_ID = process.env.RUNPOD_FLUX_ENDPOINT_ID

// Créditos por qualidade
const CREDITS_BY_QUALITY: Record<string, number> = {
    standard: 5,
    high: 15,
    ultra: 25,
}

// Dimensões por aspect ratio
const DIMENSIONS: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:3": { width: 1152, height: 896 },
}

// Estilos para adicionar ao prompt
const STYLE_PROMPTS: Record<string, string> = {
    realistic: "photorealistic, high detail, professional photography",
    anime: "anime style, vibrant colors, detailed illustration",
    oil_painting: "oil painting style, artistic, brush strokes, classic art",
    "3d": "3D render, CGI, high quality, octane render",
    cartoon: "cartoon style, colorful, fun, illustrated",
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

        if (!RUNPOD_API_KEY || !RUNPOD_FLUX_ENDPOINT_ID) {
            console.error("RUNPOD_API_KEY ou RUNPOD_FLUX_ENDPOINT_ID não configurados")
            return NextResponse.json(
                { error: "Configuração de API incompleta." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { prompt, negativePrompt, style, aspectRatio, quality } = body

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt é obrigatório." },
                { status: 400 }
            )
        }

        const creditsRequired = CREDITS_BY_QUALITY[quality] || 15
        const dimensions = DIMENSIONS[aspectRatio] || DIMENSIONS["1:1"]

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

        // Construir prompt final com estilo
        const stylePrompt = STYLE_PROMPTS[style] || ""
        const finalPrompt = stylePrompt ? `${prompt}, ${stylePrompt}` : prompt

        // Criar registro no banco
        const generation = await prisma.imageGeneration.create({
            data: {
                userId: session.user.id,
                prompt: finalPrompt,
                negativePrompt: negativePrompt || null,
                style: style || "realistic",
                aspectRatio: aspectRatio || "1:1",
                quality: quality || "high",
                creditsUsed: creditsRequired,
                status: "pending",
            },
        })

        // Chamar API RunPod (ComfyUI/FLUX)
        console.log("Chamando RunPod FLUX com endpoint:", RUNPOD_FLUX_ENDPOINT_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_FLUX_ENDPOINT_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        prompt: finalPrompt,
                        negative_prompt: negativePrompt || "blur, low quality, watermark, text, bad anatomy",
                        width: dimensions.width,
                        height: dimensions.height,
                        num_inference_steps: quality === "ultra" ? 50 : quality === "high" ? 30 : 20,
                        guidance_scale: 7.5,
                    },
                }),
            }
        )

        console.log("RunPod Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod:", errorData)

            await prisma.imageGeneration.update({
                where: { id: generation.id },
                data: {
                    status: "failed",
                },
            })

            return NextResponse.json(
                { error: "Erro ao iniciar geração." },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualizar com ID do RunPod
        await prisma.imageGeneration.update({
            where: { id: generation.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: generation.id,
            runpodJobId: runpodData.id,
            status: runpodData.status,
        })

    } catch (error) {
        console.error("Erro na geração de imagem:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
