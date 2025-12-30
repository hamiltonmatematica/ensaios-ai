
// Tipos de planos e limites
export const CREDIT_PLANS = {
    BASICO: {
        id: "BASICO",
        name: "Plano Básico",
        monthlyCredits: 500,
        price: 19.90,
        accumulates: false,
        stripePriceId: process.env.STRIPE_PRICE_BASIC || "price_basic_placeholder",
    },
    PADRAO: {
        id: "PADRAO",
        name: "Plano Padrão",
        monthlyCredits: 1000,
        price: 34.90,
        accumulates: false,
        stripePriceId: process.env.STRIPE_PRICE_POPULAR || "price_standard_placeholder", // Using POPULAR as match for Standard
    },
    MASTER: {
        id: "MASTER",
        name: "Plano Master",
        monthlyCredits: 1500,
        price: 49.90,
        accumulates: true,
        maxAccumulation: 3000,
        stripePriceId: process.env.STRIPE_PRICE_PRO || "price_master_placeholder",
    }
}

// Custo das features
export const FEATURE_COSTS = {
    GERAR_IMAGEM: 15,
    ENSAIO_IA: 5,
    FACE_SWAP: 5,
    UPSCALE_IMAGEM: 10,
    INPAINT: 15,
    VIRTUAL_TRY_ON: 20,
    TEXT_TO_SPEECH: 1 // por caractere ou bloco, a definir. Deixamos 1 crédito base por enquanto
}
