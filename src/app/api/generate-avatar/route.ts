import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_SADTALKER_ID = process.env.RUNPOD_SADTALKER_ENDPOINT_ID || process.env.RUNPOD_AVATAR_ENDPOINT_ID

const CREDITS_COST = 100

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado." },
                { status: 401 }
            )
        }

        if (!RUNPOD_API_KEY || !RUNPOD_SADTALKER_ID) {
            console.error("RUNPOD_API_KEY ou RUNPOD_SADTALKER_ID não configurados")
            return NextResponse.json(
                { error: "Configuração de API incompleta." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { faceImage, audio } = body

        if (!faceImage || !audio) {
            return NextResponse.json(
                { error: "Imagem do rosto e áudio são obrigatórios." },
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
        const cleanFace = faceImage.includes(',') ? faceImage.split(',')[1] : faceImage
        const cleanAudio = audio.includes(',') ? audio.split(',')[1] : audio

        // Criar registro no banco
        const avatarJob = await prisma.avatarGeneration.create({
            data: {
                userId: session.user.id,
                description: "Lip-sync avatar generation",
                style: "realistic",
                creditsUsed: CREDITS_COST,
                status: "pending",
            },
        })

        // Chamar API RunPod (SadTalker)
        console.log("Chamando RunPod SadTalker:", RUNPOD_SADTALKER_ID)

        const runpodResponse = await fetch(
            `https://api.runpod.io/v2/${RUNPOD_SADTALKER_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        face_image: cleanFace,
                        audio: cleanAudio,
                        enhancer: "gfpgan",
                    },
                }),
            }
        )

        console.log("RunPod SadTalker Response Status:", runpodResponse.status)

        if (!runpodResponse.ok) {
            const errorData = await runpodResponse.text()
            console.error("Erro RunPod SadTalker:", errorData)

            await prisma.avatarGeneration.update({
                where: { id: avatarJob.id },
                data: { status: "failed" },
            })

            return NextResponse.json(
                { error: "Erro ao gerar avatar." },
                { status: 500 }
            )
        }

        const runpodData = await runpodResponse.json()

        // Atualizar com ID do RunPod
        await prisma.avatarGeneration.update({
            where: { id: avatarJob.id },
            data: {
                runpodJobId: runpodData.id,
                status: "processing",
            },
        })

        return NextResponse.json({
            success: true,
            jobId: avatarJob.id,
            runpodJobId: runpodData.id,
            status: runpodData.status,
        })

    } catch (error) {
        console.error("Erro no avatar generation:", error)
        return NextResponse.json(
            { error: "Erro ao processar. Tente novamente." },
            { status: 500 }
        )
    }
}
