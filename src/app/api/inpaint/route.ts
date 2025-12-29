import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_COMFYUI_ID = process.env.RUNPOD_COMFYUI_ID || process.env.RUNPOD_FLUX_ENDPOINT_ID

const CREDITS_COST = 15

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        if (!RUNPOD_API_KEY || !RUNPOD_COMFYUI_ID) {
            console.error("RUNPOD_API_KEY ou RUNPOD_COMFYUI_ID não configurados")
            return NextResponse.json(
                { error: "Configuração de API incompleta." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { image, mask, prompt } = body

        if (!image || !mask) {
            return NextResponse.json(
                { error: "Imagem e máscara são obrigatórias." },
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
        const cleanImage = image.includes(',') ? image.split(',')[1] : image
        const cleanMask = mask.includes(',') ? mask.split(',')[1] : mask

        // Criar registro no banco
        const inpaintJob = await prisma.inpaint.create({
            data: {
                userId: session.user.id,
                imageUrl: image.substring(0, 100) + "...",
                maskUrl: mask.substring(0, 100) + "...",
                creditsUsed: CREDITS_COST,
                status: "pending",
            },
        })

        // Chamar API RunPod (ComfyUI para inpaint)
        console.log("Chamando RunPod Inpaint:", RUNPOD_COMFYUI_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.io/v2/${RUNPOD_COMFYUI_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        image: cleanImage,
                        mask: cleanMask,
                        prompt: prompt || "remove object, clean background",
                        strength: 0.8,
                        steps: 25,
                    },
                }),
            }
        )

        console.log("RunPod Inpaint Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod Inpaint:", errorData)

            await prisma.inpaint.update({
                where: { id: inpaintJob.id },
                data: { status: "failed" },
            })

            return NextResponse.json(
                { error: "Erro ao iniciar inpaint." },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualizar com ID do RunPod
        await prisma.inpaint.update({
            where: { id: inpaintJob.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: inpaintJob.id,
            runpodJobId: runpodData.id,
            status: runpodData.status,
        })

    } catch (error) {
        console.error("Erro no inpaint:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
