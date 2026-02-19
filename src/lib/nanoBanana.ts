import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || '')

interface GenerationParams {
    referenceImages: string[]
    promptTemplate: string
    aspectRatio: string
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Gera uma imagem usando o Google Gemini (nano-banana-pro-preview).
 * Retry com backoff para erros 429 (rate limit).
 */
export async function generatePhotoshootImage({
    referenceImages,
    promptTemplate,
    aspectRatio,
}: GenerationParams) {
    console.log(`[Gemini] Iniciando geração. Images: ${referenceImages.length}, Ratio: ${aspectRatio}`)

    const model = genAI.getGenerativeModel({ model: "models/nano-banana-pro-preview" })

    const imageParts = referenceImages.map((base64) => ({
        inlineData: {
            data: base64.includes(',') ? base64.split(',')[1] : base64,
            mimeType: "image/jpeg"
        },
    }))

    const fullPrompt = `
    ${promptTemplate}
    Mantenha fidelidade às características físicas das imagens de referência acima.
    Estilo: Fotografia profissional de alta qualidade, 8k, iluminação de estúdio.
  `

    let attempts = 0
    const maxAttempts = 2
    let lastError: any = null

    while (attempts < maxAttempts) {
        try {
            attempts++
            console.log(`[Gemini] Tentativa ${attempts}/${maxAttempts}...`)

            const result = await model.generateContent([
                fullPrompt,
                ...imageParts
            ])

            const response = await result.response
            const candidates = response.candidates

            if (candidates && candidates.length > 0) {
                const parts = candidates[0].content.parts
                const imagePart = parts.find((p: any) => p.inlineData)

                if (imagePart?.inlineData) {
                    console.log(`[Gemini] ✅ Imagem gerada com sucesso!`)
                    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
                }
            }

            const text = response.text()
            if (text.startsWith('http')) return text
            if (text.length > 100) return `data:image/jpeg;base64,${text.trim()}`

            throw new Error(`Resposta inesperada do Gemini: ${text.substring(0, 80)}`)

        } catch (error: any) {
            lastError = error
            const isRateLimit = error.message?.includes('429') || error.status === 429

            if (isRateLimit && attempts < maxAttempts) {
                const waitTime = 5000
                console.warn(`[Gemini] ⚠️ Rate limit (429). Aguardando ${waitTime / 1000}s antes de tentar novamente...`)
                await sleep(waitTime)
                continue
            }

            console.error(`[Gemini] ❌ Erro (Tentativa ${attempts}): ${error.message}`)
            break
        }
    }

    // Erro final com mensagem clara
    const isRateLimit = lastError?.message?.includes('429')
    if (isRateLimit) {
        throw new Error("A API do Google atingiu o limite de requisições (429). Tente novamente em alguns minutos ou verifique seu plano de billing no Google AI Studio.")
    }

    throw new Error(`Erro ao gerar imagem: ${lastError?.message || 'Erro desconhecido'}`)
}
