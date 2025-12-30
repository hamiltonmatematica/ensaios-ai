import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_VIRTUAL_TRY_ON_ID = "a71bxqwgd57jzz" // IDM-VTON Endpoint

const CREDITS_COST = 20

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        if (!RUNPOD_API_KEY) {
            console.error("RUNPOD_API_KEY não configurado")
            return NextResponse.json(
                { error: "Erro de configuração no servidor." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { personImage, garmentImage, category } = body

        if (!personImage || !garmentImage) {
            return NextResponse.json(
                { error: "Imagens são obrigatórias." },
                { status: 400 }
            )
        }

        // Verificar créditos
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { credits: true },
        })

        if (!user || user.credits < CREDITS_COST) {
            return NextResponse.json(
                { error: "Créditos insuficientes.", required: CREDITS_COST, available: user?.credits || 0 },
                { status: 402 }
            )
        }

        // Limpar base64
        const cleanPerson = personImage.includes(',') ? personImage.split(',')[1] : personImage
        const cleanGarment = garmentImage.includes(',') ? garmentImage.split(',')[1] : garmentImage

        // Mapear categoria frontend -> backend
        // IDM-VTON categories: upper_body, lower_body, dresses
        const clothTypeMap: Record<string, string> = {
            "upper_body": "upper_body",
            "lower_body": "lower_body",
            "dresses": "dresses"
        }

        // Determinar cloth_type para o modelo (opcional, mas bom ter)
        const clothType = category === "upper_body" ? "shirt" :
            category === "lower_body" ? "pants" : "dress"

        // Criar registro no banco
        const tryOnJob = await prisma.virtualTryOn.create({
            data: {
                userId: session.user.id,
                personImageUrl: personImage.substring(0, 100) + "...",
                garmentImageUrl: garmentImage.substring(0, 100) + "...",
                category: category,
                creditsUsed: CREDITS_COST,
                status: "pending",
            },
        })

        // Chamar API RunPod (IDM-VTON)
        console.log("Chamando RunPod Virtual Try-On:", RUNPOD_VIRTUAL_TRY_ON_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_VIRTUAL_TRY_ON_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        reference_image: cleanPerson,
                        cloth_image: cleanGarment,
                        image_category: clothTypeMap[category] || "upper_body",
                        cloth_type: clothType,
                        num_inference_steps: 30,
                        guidance_scale: 7.5
                    },
                }),
            }
        )

        console.log("RunPod Try-On Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod Try-On:", errorData)

            await prisma.virtualTryOn.update({
                where: { id: tryOnJob.id },
                data: { status: "failed" },
            })

            return NextResponse.json(
                { error: "Erro ao iniciar provador virtual." },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualizar com ID do RunPod
        await prisma.virtualTryOn.update({
            where: { id: tryOnJob.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: tryOnJob.id,
            runpodJobId: runpodData.id,
            status: runpodData.status,
        })

    } catch (error) {
        console.error("Erro no virtual try-on:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
