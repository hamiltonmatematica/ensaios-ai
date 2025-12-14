import { GoogleGenerativeAI } from "@google/generative-ai"

const API_KEY = process.env.GEMINI_API_KEY || ''

// Mapeamento de aspect ratios
const ASPECT_RATIO_MAP: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '3:4': '3:4',
    '4:3': '4:3',
    '4:5': '4:5',
}

interface GenerateImageParams {
    referenceImages: string[]
    promptTemplate: string
    aspectRatio: string
}

export async function generatePhotoshootImage({
    referenceImages,
    promptTemplate,
    aspectRatio,
}: GenerateImageParams): Promise<string> {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY não configurada.")
    }

    const genAI = new GoogleGenerativeAI(API_KEY)
    const apiAspectRatio = ASPECT_RATIO_MAP[aspectRatio] || '3:4'

    // Prepara as imagens de referência
    const imageParts = referenceImages.slice(0, 3).map((base64Data) => {
        const cleanBase64 = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data

        const mimeMatch = base64Data.match(/data:([^;]+);/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'

        return {
            inlineData: {
                data: cleanBase64,
                mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
            },
        }
    })

    // Prompt para gerar a imagem
    const prompt = `Based on these reference photos, generate a new professional photoshoot image with the following style:

${promptTemplate}

Important:
- Maintain the person's facial features, skin tone, and overall appearance from the reference photos
- Apply the style described above
- High quality, professional lighting
- Aspect ratio: ${apiAspectRatio}
- Photorealistic result

Generate the image now.`

    try {
        // Usando Imagen 3 para geração de imagens
        const model = genAI.getGenerativeModel({
            model: "imagen-3.0-generate-002"
        })

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    ...imageParts
                ]
            }],
        })

        const response = result.response

        // Verifica se há imagem na resposta
        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0]
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    const partData = part as { inlineData?: { data: string; mimeType?: string } }
                    if (partData.inlineData && partData.inlineData.data) {
                        const mimeType = partData.inlineData.mimeType || 'image/png'
                        return `data:${mimeType};base64,${partData.inlineData.data}`
                    }
                }
            }
        }

        // Se não gerou imagem, tenta ler o texto de erro
        let textResponse = ""
        try { textResponse = response.text() } catch { /* ignore */ }

        throw new Error(`Não foi possível gerar a imagem. Resposta: ${textResponse.substring(0, 100)}`)

    } catch (error: unknown) {
        console.error("Erro na geração:", error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        throw new Error(`Falha na geração: ${errorMessage}`)
    }
}

// Helper para converter File para base64 (client-side)
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
    })
}
