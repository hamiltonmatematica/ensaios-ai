import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_TTS_ENDPOINT_ID = process.env.RUNPOD_TTS_ENDPOINT_ID

// Calcular créditos baseado em palavras
const calculateCredits = (text: string): number => {
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
    if (wordCount <= 100) return 20
    if (wordCount <= 500) return 100
    if (wordCount <= 1000) return 200
    return Math.ceil(wordCount / 5)
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

        if (!RUNPOD_API_KEY || !RUNPOD_TTS_ENDPOINT_ID) {
            console.error("RUNPOD_API_KEY ou RUNPOD_TTS_ENDPOINT_ID não configurados")
            return NextResponse.json(
                { error: "Configuração de API incompleta." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { text, voice, language, speed } = body

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: "Texto é obrigatório." },
                { status: 400 }
            )
        }

        const creditsRequired = calculateCredits(text)

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

        // Criar registro no banco
        const ttsJob = await prisma.textToSpeech.create({
            data: {
                userId: session.user.id,
                text: text.trim(),
                voice: voice || "female",
                language: language || "pt-BR",
                speed: speed || 1.0,
                creditsUsed: creditsRequired,
                status: "pending",
            },
        })

        // Chamar API RunPod (Chatterbox TTS)
        console.log("Chamando RunPod TTS com endpoint:", RUNPOD_TTS_ENDPOINT_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_TTS_ENDPOINT_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        text: text.trim(),
                        voice: voice || "female",
                        language: language || "pt-BR",
                        speed: speed || 1.0,
                    },
                }),
            }
        )

        console.log("RunPod TTS Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod TTS:", errorData)

            await prisma.textToSpeech.update({
                where: { id: ttsJob.id },
                data: { status: "failed" },
            })

            return NextResponse.json(
                { error: "Erro ao iniciar síntese de voz." },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualizar com ID do RunPod
        await prisma.textToSpeech.update({
            where: { id: ttsJob.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: ttsJob.id,
            runpodJobId: runpodData.id,
            status: runpodData.status,
        })

    } catch (error) {
        console.error("Erro no TTS:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
