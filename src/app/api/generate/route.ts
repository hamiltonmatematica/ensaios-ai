import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { generatePhotoshootImage } from "@/lib/nanoBanana"
import { NextRequest, NextResponse } from "next/server"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

// Tiers de qualidade e seus custos
const QUALITY_TIERS: Record<string, number> = {
    "standard": 2,
    "enhanced": 6,
    "premium": 10,
}

export async function POST(request: NextRequest) {
    try {
        // Verifica autenticação com Supabase
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user?.email) {
            return NextResponse.json(
                { error: "Você precisa estar logado para gerar imagens." },
                { status: 401 }
            )
        }

        // Parse do body
        const body = await request.json()
        const { modelId, aspectRatio, referenceImages, tier = "enhanced" } = body

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

        // Calcula créditos baseado no tier
        const creditsRequired = QUALITY_TIERS[tier] || QUALITY_TIERS["enhanced"]

        // Busca o usuário (usando email como chave)
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true },
        })

        if (!dbUser) {
            return NextResponse.json(
                { error: "Usuário não encontrado." },
                { status: 404 }
            )
        }

        // Verifica créditos usando CreditService
        try {
            await CreditService.assertUserHasCredits(dbUser.id, creditsRequired)
        } catch (e) {
            // Busca saldo atual para mensagem de erro
            const balance = await CreditService.getBalance(dbUser.id)
            return NextResponse.json(
                {
                    error: "Créditos insuficientes.",
                    required: creditsRequired,
                    available: balance.totalCredits,
                },
                { status: 402 }
            )
        }

        // Cria registro de geração pendente
        const generation = await prisma.generation.create({
            data: {
                userId: dbUser.id,
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

            // Deduz créditos usando CreditService
            console.log(`[Ensaio IA] Debitando ${creditsRequired} créditos (tier: ${tier}) para usuário ${dbUser.id}`)
            await CreditService.consumeCredits(
                dbUser.id,
                creditsRequired,
                `ENSAIO_${tier.toUpperCase()}_${model.name}`
            )
            console.log(`[Ensaio IA] Créditos debitados com sucesso`)

            // Obtém saldo atualizado
            const updatedBalance = await CreditService.getBalance(dbUser.id)
            console.log(`[Ensaio IA] Novo saldo: ${updatedBalance.totalCredits}`)

            return NextResponse.json({
                success: true,
                generationId: generation.id,
                imageUrl: resultUrl,
                creditsRemaining: updatedBalance.totalCredits,
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
