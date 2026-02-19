import { callFalAi } from "./fal"

// Mapeamento de aspect ratios do frontend para Fal.ai (Flux)
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || '')

interface GenerationParams {
    referenceImages: string[]
    promptTemplate: string
    aspectRatio: string
}

const ASPECT_RATIO_MAP_FAL: Record<string, string> = {
    "1:1": "square",
    "3:4": "portrait_4_3",
    "4:3": "landscape_4_3",
    "9:16": "portrait_16_9",
    "16:9": "landscape_16_9",
    "2:3": "portrait_9_16",
    "4:5": "portrait_4_3"
}

/**
 * Utilitário para pausa (sleep)
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Gera uma imagem tentando primeiro o Google Gemini (Nano Banana) com retries.
 * Se falhar por cota (429), faz o fallback automático para Fal.ai (Flux).
 */
export async function generatePhotoshootImage({
    referenceImages,
    promptTemplate,
    aspectRatio,
}: GenerationParams) {
    console.log(`[NanoBanana] generatePhotoshootImage called with ${referenceImages.length} images`)
    console.log(`[NanoBanana] Aspect Ratio: ${aspectRatio}`)

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
    const maxAttempts = 3
    let lastError: any = null

    // TENTA GOOGLE PRIMEIRO (Até 3 vezes se for 429)
    while (attempts < maxAttempts) {
        try {
            attempts++
            const result = await model.generateContent([
                fullPrompt,
                ...imageParts
            ])

            const response = await result.response
            const candidates = response.candidates

            if (candidates && candidates.length > 0) {
                const parts = candidates[0].content.parts
                const imagePart = parts.find(p => p.inlineData)

                if (imagePart?.inlineData) {
                    console.log(`[NanoBanana] Geração via Google Gemini concluída com sucesso.`)
                    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
                }
            }

            const text = response.text()
            if (text.startsWith('http')) return text
            if (text.length > 100) return `data:image/jpeg;base64,${text.trim()}`

            throw new Error(`Resposta inesperada do Google: ${text.substring(0, 50)}...`)

        } catch (error: any) {
            lastError = error
            const isRateLimit = error.message?.includes('429') || error.status === 429

            if (isRateLimit && attempts < maxAttempts) {
                const waitTime = attempts * 3000
                console.warn(`[NanoBanana] Google API 429 (Rate Limit). Tentativa ${attempts}/${maxAttempts}. Aguardando ${waitTime / 1000}s...`)
                await sleep(waitTime)
                continue
            }

            console.warn(`[NanoBanana] Google falhou (Tentativa ${attempts}): ${error.message}`)
            break // Se não for rate limit ou acabar as tentativas, sai do loop Google
        }
    }

    // FALLBACK PARA FAL.AI
    console.log(`[NanoBanana] Iniciando Fallback automático para Fal.ai (Flux) devido a erro/cota no Google.`)
    try {
        const falAspectRatio = ASPECT_RATIO_MAP_FAL[aspectRatio] || "portrait_4_3"

        const response = await callFalAi("fal-ai/flux/schnell", {
            prompt: `${promptTemplate}, professional photoshoot style, high quality, consistent with reference features`,
            image_size: falAspectRatio,
            num_images: 1,
            enable_safety_checker: true,
            sync_mode: true
        })

        if (response && response.images && response.images.length > 0) {
            const imageUrl = response.images[0].url
            console.log(`[NanoBanana] Geração via Fallback Fal.ai concluída com sucesso: ${imageUrl}`)
            return imageUrl
        }

        throw new Error("Fal.ai fallback não retornou nenhuma imagem.")

    } catch (falError: any) {
        console.error(`[NanoBanana] Erro crítico: Google e Fal.ai falharam. Original Google Error: ${lastError?.message}. Fal Error: ${falError.message}`)
        throw new Error(`Falha total em todos os provedores: ${falError.message}`)
    }
}

