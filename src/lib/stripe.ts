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

// Pacotes de Créditos - Opção Conservadora
// Base + Bônus = Total (válidos por 90 dias)
export const CREDIT_PACKAGES = [
    {
        id: 'starter',
        name: 'Starter',
        baseCredits: 50,
        bonusCredits: 0,
        credits: 50, // Total
        price: 990, // R$ 9,90
        priceDisplay: 'R$ 9,90',
        pricePerCredit: '~R$ 0,20',
        stripePriceId: process.env.STRIPE_PRICE_STARTER || '',
        isBestValue: false,
        badge: '',
        features: [
            '10 face swaps',
            '2-5 upscales',
            '10 ensaios de IA',
            'Válido por 90 dias'
        ]
    },
    {
        id: 'popular',
        name: 'Popular',
        baseCredits: 100,
        bonusCredits: 50,
        credits: 150, // Total
        price: 1990, // R$ 19,90
        priceDisplay: 'R$ 19,90',
        pricePerCredit: '~R$ 0,13',
        stripePriceId: process.env.STRIPE_PRICE_POPULAR || '',
        isBestValue: true,
        badge: '🌟 MAIS VENDIDO',
        features: [
            '30 face swaps',
            '7-15 upscales',
            '30 ensaios de IA',
            '+50 créditos bônus',
            'Válido por 90 dias'
        ]
    },
    {
        id: 'pro',
        name: 'Pro',
        baseCredits: 250,
        bonusCredits: 100,
        credits: 350, // Total
        price: 3990, // R$ 39,90
        priceDisplay: 'R$ 39,90',
        pricePerCredit: '~R$ 0,11',
        stripePriceId: process.env.STRIPE_PRICE_PRO || '',
        isBestValue: false,
        badge: '💎 ÓTIMO VALOR',
        features: [
            '70 face swaps',
            '17-35 upscales',
            '70 ensaios de IA',
            '+100 créditos bônus',
            'Válido por 90 dias'
        ]
    },
    {
        id: 'premium',
        name: 'Premium',
        baseCredits: 600,
        bonusCredits: 200,
        credits: 800, // Total
        price: 7990, // R$ 79,90
        priceDisplay: 'R$ 79,90',
        pricePerCredit: '~R$ 0,10',
        stripePriceId: process.env.STRIPE_PRICE_PREMIUM || '',
        isBestValue: false,
        badge: '🚀 PARA NEGÓCIOS',
        features: [
            '160 face swaps',
            '40-80 upscales',
            '160 ensaios de IA',
            '+200 créditos bônus',
            'Válido por 90 dias'
        ]
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
                        description: `${pkg.baseCredits} créditos${pkg.bonusCredits > 0 ? ` + ${pkg.bonusCredits} bônus` : ''} (válidos por 90 dias)`,
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
            credits: pkg.credits.toString(),
            baseCredits: pkg.baseCredits.toString(),
            bonusCredits: pkg.bonusCredits.toString(),
        },
    })

    return session
}
