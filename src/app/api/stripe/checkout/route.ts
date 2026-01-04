
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getStripe, CREDIT_PACKAGES } from "@/lib/stripe"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 })
        }

        const { packageId } = await req.json()
        const selectedPackage = CREDIT_PACKAGES.find(p => p.id === packageId)

        if (!selectedPackage) {
            return NextResponse.json({ error: "Pacote inválido." }, { status: 400 })
        }

        const stripe = getStripe()

        // Determina a URL base para retorno (localhost ou produção)
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card", "boleto"], // Add "pix" if your Stripe account supports it
            line_items: [
                {
                    price_data: {
                        currency: "brl",
                        product_data: {
                            name: selectedPackage.name,
                            description: `${selectedPackage.credits} créditos (válidos por 90 dias)`,
                        },
                        unit_amount: selectedPackage.price, // Already in cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId: session.user.id,
                packageId: packageId,
                credits: selectedPackage.credits.toString()
            },
            success_url: `${baseUrl}/my-photos?success=true`,
            cancel_url: `${baseUrl}/?canceled=true`,
        })

        return NextResponse.json({ url: checkoutSession.url })
    } catch (error) {
        console.error("Erro no checkout:", error)
        return NextResponse.json({ error: "Erro ao criar sessão de pagamento." }, { status: 500 })
    }
}
