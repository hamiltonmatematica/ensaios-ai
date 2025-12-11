import Stripe from 'stripe'

// Lazy initialization para evitar erro no build sem credenciais
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
    if (!stripeInstance) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY não configurada')
        }
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
            typescript: true,
        })
    }
    return stripeInstance
}

// Pacotes de créditos - Tabela conservadora
export const CREDIT_PACKAGES = [
    {
        id: 'basic',
        name: 'Pacote Básico',
        images: 10,
        price: 1490, // centavos (R$ 14,90)
        priceDisplay: 'R$ 14,90',
        savings: 'R$ 1,49 por foto',
        stripePriceId: process.env.STRIPE_PRICE_BASIC!,
        isBestValue: false,
    },
    {
        id: 'popular',
        name: 'Pacote Popular',
        images: 20,
        price: 2490, // centavos (R$ 24,90)
        priceDisplay: 'R$ 24,90',
        savings: 'R$ 1,25 por foto',
        stripePriceId: process.env.STRIPE_PRICE_POPULAR!,
        isBestValue: true,
    },
    {
        id: 'pro',
        name: 'Pacote Pro',
        images: 30,
        price: 3490, // centavos (R$ 34,90)
        priceDisplay: 'R$ 34,90',
        savings: 'R$ 1,16 por foto',
        stripePriceId: process.env.STRIPE_PRICE_PRO!,
        isBestValue: false,
    },
]

export type CreditPackage = typeof CREDIT_PACKAGES[number]

export async function createCheckoutSession(
    userId: string,
    userEmail: string,
    packageId: string
) {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
    if (!pkg) throw new Error('Pacote inválido')

    const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card', 'boleto', 'pix'],
        line_items: [
            {
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: pkg.name,
                        description: `${pkg.images} gerações de ensaio fotográfico com IA`,
                    },
                    unit_amount: pkg.price,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/?canceled=true`,
        customer_email: userEmail,
        metadata: {
            userId,
            packageId: pkg.id,
            credits: pkg.images.toString(),
        },
    })

    return session
}
