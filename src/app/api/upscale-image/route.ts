import { createClient } from "@/lib/supabase-server"
import { CreditService } from "@/lib/credit-service"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "qqx0my03hxzi5k"

// Créditos por escala
const CREDITS_BY_SCALE: Record<string, number> = {
    "2x": 10,
    "4x": 20,
}

// Utility functions
function cleanBase64(data: string): string {
    return data.replace(/^data:image\/[a-zA-Z]+;base64,/, "")
}

export async function POST(request: NextRequest) {
    try {
        // 1. Autenticação com Supabase
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user?.email) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        // Busca usuário no Prisma
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true }
        })

        if (!dbUser) {
            return NextResponse.json(
                { error: "Usuário não encontrado." },
                { status: 404 }
            )
        }

        // 2. Validar input
        const body = await request.json()
        const { image, scale } = body

        if (!image) {
            return NextResponse.json(
                { error: "Imagem é obrigatória." },
                { status: 400 }
            )
        }

        const factor = scale === "4x" ? 4 : 2

        // 3. Verificar créditos
        const creditsRequired = CREDITS_BY_SCALE[scale || "4x"] || 20
        await CreditService.assertUserHasCredits(dbUser.id, creditsRequired)

        // 4. Criar registro no banco (status: processing)
        const job = await prisma.imageUpscale.create({
            data: {
                userId: dbUser.id,
                status: "processing",
                imageUrl: image,
                scale: scale || "4x",
                creditsUsed: creditsRequired,
                runpodJobId: `pending-${Date.now()}`,
            }
        })

        // 5. Preparar payload para Real-ESRGAN
        const cleanImage = cleanBase64(image)

        console.log(`[UPSCALE] Chamando Real-ESRGAN ${scale} no endpoint ${RUNPOD_UPSCALE_ENDPOINT_ID}`)

        // 6. Chamar RunPod (Assíncrono)
        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        source_image: cleanImage,
                        scale: factor,
                    }
                }),
            }
        )

        console.log("[UPSCALE] RunPod response status:", runpodResponse.status)

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
        console.log("[UPSCALE] RunPod job criado:", runpodData.id, "status:", runpodData.status)

        // 7. Atualizar job com ID do RunPod
        await prisma.imageUpscale.update({
            where: { id: job.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing"
            }
        })

        // 8. Retornar job ID para polling (não debita créditos ainda)
        return NextResponse.json({
            success: true,
            jobId: job.id,
            runpodJobId: runpodData.id,
            status: runpodData.status
        })

    } catch (error: unknown) {
        console.error("[UPSCALE] Erro interno:", error)
        return NextResponse.json(
            { error: "Erro interno do servidor." },
            { status: 500 }
        )
    }
}
