import { callFalAi } from "./fal"

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
 * Gera imagem usando Fal.ai (Flux Schnell).
 * Google Gemini foi desabilitado por estar permanentemente em rate limit (429).
 */
export async function generatePhotoshootImage({
    referenceImages,
    promptTemplate,
    aspectRatio,
}: GenerationParams) {
    console.log(`[NanoBanana] Gerando imagem via Fal.ai. Images: ${referenceImages.length}, Ratio: ${aspectRatio}`)

    const falAspectRatio = ASPECT_RATIO_MAP_FAL[aspectRatio] || "portrait_4_3"

    try {
        const response = await callFalAi("fal-ai/flux/schnell", {
            prompt: `${promptTemplate}, professional photoshoot style, high quality, studio lighting, 8k`,
            image_size: falAspectRatio,
            num_images: 1,
            enable_safety_checker: true,
        })

        if (response && response.images && response.images.length > 0) {
            const imageUrl = response.images[0].url
            console.log(`[NanoBanana] ✅ Imagem gerada com sucesso: ${imageUrl}`)
            return imageUrl
        }

        throw new Error("Fal.ai não retornou nenhuma imagem.")

    } catch (error: any) {
        console.error(`[NanoBanana] ❌ Erro na geração: ${error.message}`)
        throw new Error(`Falha ao gerar imagem: ${error.message}`)
    }
}
