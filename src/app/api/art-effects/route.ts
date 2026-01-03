import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ART_STYLES } from "@/lib/art-styles"
import {
    handleRunPodError,
    validateEndpointConfig,
    logRunPodOperation,
    parseRunPodOutput,
    ensureBase64Prefix
} from "@/lib/runpod-error-handler"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_FLUX_ENDPOINT_ID = process.env.RUNPOD_FLUX_ENDPOINT_ID // FLUX model for image generation

const CREDITS_COST = 35 // 25 (generation) + 10 (upscale)

export async function POST(request: NextRequest) {
    const startTime = Date.now()

    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        // Validate endpoint configuration
        const configValidation = validateEndpointConfig({
            apiKey: RUNPOD_API_KEY,
            endpointId: RUNPOD_FLUX_ENDPOINT_ID,
            name: "Art Effects (FLUX)"
        })

        if (!configValidation.valid) {
            console.error("Configuração inválida:", configValidation.error)
            return NextResponse.json(
                { error: "Erro de configuração no servidor." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { image, styleId } = body

        if (!image || !styleId) {
            return NextResponse.json(
                { error: "Imagem e estilo são obrigatórios" },
                { status: 400 }
            )
        }

        // Validate style
        const style = ART_STYLES.find(s => s.id === styleId)
        if (!style) {
            return NextResponse.json(
                { error: "Estilo inválido" },
                { status: 400 }
            )
        }

        // Validate image size (base64 string length check)
        const cleanImage = image.replace(/^data:image\/[a-z]+;base64,/, "")
        const imageSizeBytes = (cleanImage.length * 3) / 4 // Approximate base64 to bytes

        if (imageSizeBytes > 10 * 1024 * 1024) { // 10MB limit
            return NextResponse.json(
                { error: "Imagem muito grande. Máximo 10MB." },
                { status: 400 }
            )
        }

        // Check credits (but don't deduct yet)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        })

        if (!user || user.credits < CREDITS_COST) {
            return NextResponse.json(
                { error: `Créditos insuficientes. Você precisa de ${CREDITS_COST} créditos.` },
                { status: 402 }
            )
        }

        // Create job record in database
        const artJob = await prisma.artEffect.create({
            data: {
                userId: session.user.id,
                inputImage: cleanImage.substring(0, 100) + "...", // Store truncated for space
                styleId: styleId,
                styleName: style.name,
                status: "pending",
            },
        })

        logRunPodOperation("art-effects-start", {
            endpoint: RUNPOD_FLUX_ENDPOINT_ID,
            jobId: artJob.id
        })

        // Build enhanced prompt with style
        const enhancedPrompt = `${style.prompt}, high quality, detailed, professional, masterpiece`

        // Call FLUX endpoint
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
                        prompt: enhancedPrompt,
                        image: cleanImage,
                        strength: 0.75, // How much to transform (0-1)
                        num_inference_steps: 30,
                        guidance_scale: 7.5,
                    },
                }),
            }
        )

        const duration = Date.now() - startTime

        if (!runpodResponse.ok) {
            const errorBody = await runpodResponse.text()

            const errorResult = handleRunPodError(
                runpodResponse.status,
                errorBody,
                "art-effects"
            )

            logRunPodOperation("art-effects-error", {
                endpoint: RUNPOD_FLUX_ENDPOINT_ID,
                status: runpodResponse.status,
                error: errorResult.message,
                duration
            })

            await prisma.artEffect.update({
                where: { id: artJob.id },
                data: {
                    status: "failed",
                    errorMessage: errorResult.message
                },
            })

            return NextResponse.json(
                {
                    error: errorResult.message,
                    shouldRetry: errorResult.shouldRetry
                },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        logRunPodOperation("art-effects-submitted", {
            endpoint: RUNPOD_FLUX_ENDPOINT_ID,
            jobId: artJob.id,
            status: runpodData.status,
            duration
        })

        // Update job with RunPod job ID
        await prisma.artEffect.update({
            where: { id: artJob.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: artJob.id,
            runpodJobId: runpodData.id,
            status: runpodData.status || "IN_QUEUE",
        })

    } catch (error) {
        const duration = Date.now() - startTime

        logRunPodOperation("art-effects-exception", {
            error: error instanceof Error ? error.message : "Unknown error",
            duration
        })

        return NextResponse.json(
            { error: "Erro interno no servidor. Tente novamente." },
            { status: 500 }
        )
    }
}
