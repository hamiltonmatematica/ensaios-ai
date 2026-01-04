import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
        return NextResponse.json(
            { error: "Missing signature or webhook secret" },
            { status: 400 }
        )
    }

    let event: Stripe.Event

    try {
        event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
        console.error("Webhook signature verification failed:", err)
        return NextResponse.json(
            { error: "Webhook signature verification failed" },
            { status: 400 }
        )
    }

    // Processa eventos do Stripe
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session

            const userId = session.metadata?.userId
            const packageId = session.metadata?.packageId
            const credits = parseInt(session.metadata?.credits || "0")

            if (!userId || !credits) {
                console.error("Metadata incompleta:", session.metadata)
                break
            }

            try {
                // Registra a transação
                await prisma.transaction.create({
                    data: {
                        userId,
                        stripeId: session.id,
                        packageId: packageId || "unknown",
                        amount: (session.amount_total || 0) / 100, // Converte de centavos
                        credits,
                        status: "completed",
                    },
                })

                // Adiciona créditos ao usuário (+ sistema V2 CreditBalance)
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    include: { creditBalance: true }
                })

                if (user) {
                    if (user.creditBalance) {
                        // Usuário já migrado: atualiza tabela nova
                        await prisma.creditBalance.update({
                            where: { userId },
                            data: { totalCredits: { increment: credits } }
                        })
                    } else {
                        // Usuário legado: cria tabela nova somando saldo antigo + compra
                        await prisma.creditBalance.create({
                            data: {
                                userId,
                                totalCredits: (user.credits ?? 0) + credits
                            }
                        })
                    }

                    // (Opcional) Mantém campo legado atualizado por segurança, mas o app usa CreditBalance
                    /* await prisma.user.update({
                        where: { id: userId },
                        data: { credits: { increment: credits } }
                    }) */
                }

                console.log(`✅ ${credits} créditos adicionados ao usuário ${userId}`)
            } catch (dbError) {
                console.error("Erro ao processar pagamento:", dbError)
                return NextResponse.json(
                    { error: "Erro ao processar pagamento" },
                    { status: 500 }
                )
            }
            break
        }

        case "checkout.session.expired": {
            console.log("Checkout expirado:", event.data.object.id)
            break
        }

        default:
            console.log(`Evento não tratado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
}
