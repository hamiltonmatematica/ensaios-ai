import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePhotoshootImage } from "@/lib/nanoBanana"
import { NextRequest, NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // Verifica autenticação
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Você precisa estar logado para gerar imagens." },
                { status: 401 }
            )
        }

        // Parse do body
        const body = await request.json()
        const { modelId, aspectRatio, referenceImages } = body

        // Validações
        if (!modelId || !aspectRatio || !referenceImages) {
            return NextResponse.json(
                { error: "Dados incompletos. Envie modelId, aspectRatio e referenceImages." },
                { status: 400 }
            )
        }

        if (!Array.isArray(referenceImages) || referenceImages.length < 3) {
            return NextResponse.json(
                { error: "Você precisa enviar pelo menos 3 fotos de referência." },
                { status: 400 }
            )
        }

        // Busca o modelo
        const model = await prisma.photoModel.findUnique({
            where: { id: modelId, isActive: true },
        })

        if (!model) {
            return NextResponse.json(
                { error: "Modelo não encontrado ou inativo." },
                { status: 404 }
            )
        }

        // Busca o usuário para verificar créditos
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { credits: true },
        })

        if (!user || user.credits < model.creditsRequired) {
            return NextResponse.json(
                {
                    error: "Créditos insuficientes.",
                    required: model.creditsRequired,
                    available: user?.credits || 0,
                },
                { status: 402 }
            )
        }

        // Cria registro de geração pendente
        const generation = await prisma.generation.create({
            data: {
                userId: session.user.id,
                modelId: model.id,
                aspectRatio,
                status: "PROCESSING",
            },
        })

        try {
            // Gera a imagem
            const resultUrl = await generatePhotoshootImage({
                referenceImages,
                promptTemplate: model.promptTemplate,
                aspectRatio,
            })

            // Atualiza a geração com sucesso
            await prisma.generation.update({
                where: { id: generation.id },
                data: {
                    resultUrl,
                    status: "COMPLETED",
                },
            })

            // Deduz créditos
            await prisma.user.update({
                where: { id: session.user.id },
                data: { credits: { decrement: model.creditsRequired } },
            })

            return NextResponse.json({
                success: true,
                generationId: generation.id,
                imageUrl: resultUrl,
                creditsRemaining: user.credits - model.creditsRequired,
            })
        } catch (genError) {
            // Marca geração como falha
            await prisma.generation.update({
                where: { id: generation.id },
                data: { status: "FAILED" },
            })
            throw genError
        }
    } catch (error) {
        console.error("Erro na geração:", error)
        return NextResponse.json(
            { error: "Erro ao gerar imagem. Tente novamente." },
            { status: 500 }
        )
    }
}
