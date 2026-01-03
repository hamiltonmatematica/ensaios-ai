import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { CREDIT_PLANS } from "@/lib/credit-constants"
import Stripe from "stripe"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = (await headers()).get("Stripe-Signature") as string
    const stripe = getStripe()

    let event: Stripe.Event

    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.error("STRIPE_WEBHOOK_SECRET não configurada")
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 })
        }
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (error: any) {
        console.error("Erro na assinatura do Webhook Stripe:", error.message)
        return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
    }

    const session = event.data.object as Stripe.Checkout.Session

    if (event.type === "checkout.session.completed") {

        const userId = session.metadata?.userId

        if (!userId) {
            console.error("UserId não encontrado no metadata da sessão")
            return NextResponse.json({ received: true })
        }

        // Modo Assinatura
        if (session.mode === "subscription") {
            const subscriptionId = session.subscription as string
            const planType = session.metadata?.planType // BASICO, PADRAO, MASTER

            if (planType && ["BASICO", "PADRAO", "MASTER"].includes(planType)) {
                // Buscar detalhes da subscription no Stripe para datas
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)

                // Criar ou atualizar UserSubscription
                await prisma.userSubscription.upsert({
                    where: { userId },
                    update: {
                        isActive: true,
                        stripeSubscriptionId: subscriptionId,
                        stripePriceId: subscription.items.data[0].price.id,
                        planType: planType,
                        currentPeriodStart: new Date(subscription.current_period_start * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        canceledAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
                    },
                    create: {
                        userId,
                        isActive: true,
                        stripeSubscriptionId: subscriptionId,
                        stripePriceId: subscription.items.data[0].price.id,
                        planType: planType,
                        currentPeriodStart: new Date(subscription.current_period_start * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    }
                })

                // Adicionar Créditos do Mês (Plano)
                const planCredits = CREDIT_PLANS[planType as keyof typeof CREDIT_PLANS].monthlyCredits
                await CreditService.addCredits(userId, planCredits, "PURCHASE", `SUBSCRIPTION_${planType}`, session.payment_intent as string)
            }

        } else if (session.mode === "payment") {
            // Compra avulsa
            const creditsStr = session.metadata?.credits
            const amount = creditsStr ? parseInt(creditsStr) : 0

            if (amount > 0) {
                await CreditService.addCredits(userId, amount, "PURCHASE", "ONE_TIME_PURCHASE", session.payment_intent as string)
            }
        }
    }

    // Renovação de Assinatura
    if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice

        // Se for renovação de assinatura (subscription presente)
        if (invoice.subscription) {
            const subscriptionId = invoice.subscription as string

            // Buscar UserSubscription
            const userSubscription = await prisma.userSubscription.findUnique({
                where: { stripeSubscriptionId: subscriptionId }
            })

            if (userSubscription) {
                // Atualizar datas
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)

                await prisma.userSubscription.update({
                    where: { id: userSubscription.id },
                    data: {
                        currentPeriodStart: new Date(subscription.current_period_start * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    }
                })

                // Adicionar créditos da renovação
                const planType = userSubscription.planType
                const planCredits = CREDIT_PLANS[planType as keyof typeof CREDIT_PLANS].monthlyCredits

                await CreditService.addCredits(userSubscription.userId, planCredits, "PURCHASE", `SUBSCRIPTION_RENEWAL_${planType}`, invoice.payment_intent as string)
            }
        }
    }

    // Cancelamento ou Expiração
    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
        const subscription = event.data.object as Stripe.Subscription
        const status = subscription.status

        if (["canceled", "unpaid", "past_due"].includes(status)) {
            await prisma.userSubscription.updateMany({
                where: { stripeSubscriptionId: subscription.id },
                data: { isActive: false }
            })
        } else if (status === "active") {
            // Reativou?
            await prisma.userSubscription.updateMany({
                where: { stripeSubscriptionId: subscription.id },
                data: { isActive: true }
            })
        }
    }

    return NextResponse.json({ received: true })
}
