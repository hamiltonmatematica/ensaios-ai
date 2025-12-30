import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { CreditService } from "@/lib/credit-service"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
// Usar o ID fornecido no prompt ou ler do env. 
// O usuário pediu para ler RUNPOD_UPSCALE_ENDPOINT_ID, mas já adicionei ao env.
// Fallback para o ID hardcoded caso env não carregue a tempo (segurança)
const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "kk5a0i7oi7tess"

// Créditos por escala
const CREDITS_BY_SCALE: Record<string, number> = {
    "2x": 10,
    "4x": 20,
}

// Utility functions
function cleanBase64(data: string): string {
    return data.replace(/^data:image\/[a-zA-Z]+;base64,/, "")
}

function wrapAsDataUrl(b64: string): string {
    return `data:image/png;base64,${b64}`
}

function getModelByFactor(factor: 2 | 4): string {
    return factor === 4 ? "RealESRGAN_x4plus" : "RealESRGAN_x2plus"
}

export async function POST(request: NextRequest) {
    try {
        // 1. Autenticação
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        // 2. Validar input
        const body = await request.json()
        const { image, scale } = body // Frontend envia 'image' e 'scale' ("2x" ou "4x")

        if (!image) {
            return NextResponse.json(
                { error: "Imagem é obrigatória." },
                { status: 400 }
            )
        }

        const factor = scale === "4x" ? 4 : 2

        // 3. Verificar créditos
        const creditsRequired = CREDITS_BY_SCALE[scale || "4x"] || 20
        await CreditService.assertUserHasCredits(session.user.id, creditsRequired)

        // 4. Criar registro no banco (status: processing)
        const job = await prisma.imageUpscale.create({
            data: {
                userId: session.user.id,
                status: "processing",
                imageUrl: image, // Salvar o base64 original (data URL)
                scale: scale || "4x", // String "2x" ou "4x"
                creditsUsed: creditsRequired, // Nome correto do campo no schema
                runpodJobId: `sync-${Date.now()}`,
            }
        })

        // 5. Preparar payload para Real-ESRGAN
        const cleanImage = cleanBase64(image)
        const modelName = getModelByFactor(factor)

        console.log(`[UPSCALE] Chamando Real-ESRGAN (${modelName}) no endpoint ${RUNPOD_UPSCALE_ENDPOINT_ID}`)

        // 6. Chamar RunPod (Síncrono)
        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/runsync`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        source_image: cleanImage,
                        model: modelName,
                        scale: factor,
                        face_enhance: false // Opcional, mantendo false por enquanto
                    }
                }),
            }
        )

        if (!runpodResponse.ok) {
            const errorText = await runpodResponse.text()
            console.error("[UPSCALE] Erro RunPod:", runpodResponse.status, errorText)

            await prisma.imageUpscale.update({
                where: { id: job.id },
                data: { status: "failed", errorMessage: `RunPod error: ${runpodResponse.status}` }
            })

            return NextResponse.json(
                { error: "Erro ao processar upscale no servidor." },
                { status: 502 }
            )
        }

        const runpodData = await runpodResponse.json()
        console.log("[UPSCALE] RunPod response status:", runpodData.status)

        // 7. Processar resposta
        if (runpodData.status === "COMPLETED" || runpodData.output?.status === "ok") {
            const rawB64 = runpodData.output?.image

            if (!rawB64) {
                console.error("[UPSCALE] Resposta sem imagem:", runpodData)
                await prisma.imageUpscale.update({
                    where: { id: job.id },
                    data: { status: "failed", errorMessage: "Resposta sem imagem" }
                })
                return NextResponse.json(
                    { error: "Falha ao obter imagem upscalada." },
                    { status: 500 }
                )
            }

            const resultUrl = wrapAsDataUrl(rawB64)

            // 8. Atualizar banco e debitar créditos
            await prisma.imageUpscale.update({
                where: { id: job.id },
                data: {
                    status: "completed",
                    resultUrl: resultUrl,
                    runpodJobId: runpodData.id // Atualizar com ID real se disponível
                }
            })

            await CreditService.consumeCredits(
                session.user.id,
                creditsRequired,
                "UPSCALE_IMAGEM"
            )

            // 9. Retornar sucesso
            return NextResponse.json({
                success: true,
                jobId: job.id,
                resultUrl: resultUrl,
                upscaledImageBase64: resultUrl
            })

        } else {
            console.error("[UPSCALE] Job falhou:", runpodData)
            await prisma.imageUpscale.update({
                where: { id: job.id },
                data: { status: "failed", errorMessage: JSON.stringify(runpodData.error || "Unknown error") }
            })
            return NextResponse.json(
                { error: "Falha no processamento da imagem." },
                { status: 500 }
            )
        }

    } catch (error: unknown) {
        console.error("[UPSCALE] Erro interno:", error)
        return NextResponse.json(
            { error: "Erro interno do servidor." },
            { status: 500 }
        )
    }
}
