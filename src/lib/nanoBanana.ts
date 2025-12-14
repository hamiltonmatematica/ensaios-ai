
import { GoogleGenerativeAI } from "@google/generative-ai"

// Nano Banana Pro é baseado na API do Gemini
const API_KEY = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || ''

// Mapeamento de aspect ratios do frontend para API
const ASPECT_RATIO_MAP: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '3:4': '3:4',
    '4:3': '4:3',
    '2:3': '3:4',
    '3:2': '4:3',
    '4:5': '3:4',
    '1:2': '9:16',
    '2:1': '16:9',
}

interface GenerateImageParams {
    referenceImages: string[] // base64 encoded images
    promptTemplate: string
    aspectRatio: string
}

export async function generatePhotoshootImage({
    referenceImages,
    promptTemplate,
    aspectRatio,
}: GenerateImageParams): Promise<string> {
    if (!API_KEY) {
        throw new Error("API Key não configurada. Configure NANO_BANANA_API_KEY ou GEMINI_API_KEY.")
    }

    const genAI = new GoogleGenerativeAI(API_KEY)

    // Usando modelo específico Nano Banana Pro
    const model = genAI.getGenerativeModel({ model: "models/nano-banana-pro-preview" })

    const apiAspectRatio = ASPECT_RATIO_MAP[aspectRatio] || '3:4'

    // Prepara as partes da imagem
    const imageParts = referenceImages.map((base64Data) => {
        // Remove prefixo data:image/...;base64, se existir
        const cleanBase64 = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data

        return {
            inlineData: {
                data: cleanBase64,
                mimeType: 'image/jpeg',
            },
        }
    })

    // Prompt completo
    const fullPrompt = `Generate a high-quality portrait description based on these images, then generate a new image following this description: ${promptTemplate}
  
    IMPORTANT:
    - Aspect ratio: ${apiAspectRatio}
    - Maintain facial features
    - High resolution, photorealistic`

    try {
        const result = await model.generateContent([
            fullPrompt,
            ...imageParts
        ])
        const response = result.response;

        // Verificação defensiva se há imagens (candidatos)
        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        // Retorna a imagem se encontrar
                        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
                    }
                }
            }
        }

        // Se chegou aqui, não tem imagem. Tenta ler o texto.
        let textResponse = ""
        try { textResponse = response.text() } catch (e) { }

        console.log("Gemini Response Text:", textResponse)

        // Lança erro explicativo
        throw new Error(`O modelo Gemini processou o pedido mas retornou texto em vez de imagem. Provavelmente a API Free não gera imagens diretamente. Texto retornado: ${textResponse.substring(0, 50)}...`)

    } catch (error) {
        console.error("Erro na API de geração:", error)
        throw error
    }
}

// Função auxiliar para converter File para base64 (client-side)
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
    })
}
