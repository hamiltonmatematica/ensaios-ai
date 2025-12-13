import Replicate from "replicate"
import { GoogleGenerativeAI } from "@google/generative-ai"

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// Mapeamento de aspect ratios para FLUX
const ASPECT_RATIO_MAP: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '3:4': '3:4',
    '4:3': '4:3',
    '4:5': '4:5',
    '3:2': '3:2',
    '2:3': '2:3',
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
    if (!REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN não configurado.")
    }

    const replicate = new Replicate({
        auth: REPLICATE_API_TOKEN,
    })

    const fluxAspectRatio = ASPECT_RATIO_MAP[aspectRatio] || '3:4'

    // Primeiro: usa Gemini para analisar as fotos e gerar um prompt detalhado
    let detailedPrompt = promptTemplate

    if (GEMINI_API_KEY && referenceImages.length > 0) {
        try {
            detailedPrompt = await analyzePhotosWithGemini(referenceImages, promptTemplate)
            console.log("Prompt gerado pelo Gemini:", detailedPrompt)
        } catch (error) {
            console.error("Erro na análise com Gemini, usando prompt original:", error)
        }
    }

    try {
        // Usar FLUX 1.1 Pro para gerar a imagem
        const output = await replicate.run(
            "black-forest-labs/flux-1.1-pro",
            {
                input: {
                    prompt: detailedPrompt,
                    aspect_ratio: fluxAspectRatio,
                    output_format: "webp",
                    output_quality: 90,
                    safety_tolerance: 2,
                    prompt_upsampling: true,
                }
            }
        )

        // O output é uma URL da imagem
        if (typeof output === 'string') {
            return output
        }

        // Se for array, pega o primeiro
        if (Array.isArray(output) && output.length > 0) {
            return output[0] as string
        }

        throw new Error("FLUX não retornou uma imagem válida.")

    } catch (error: unknown) {
        console.error("Erro no FLUX:", error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        throw new Error(`Falha na geração: ${errorMessage}`)
    }
}

// Analisa fotos de referência com Gemini para gerar prompt detalhado
async function analyzePhotosWithGemini(
    referenceImages: string[],
    promptTemplate: string
): Promise<string> {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // Prepara as imagens
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

    const analysisPrompt = `Analyze these reference photos carefully. Create a detailed image generation prompt in English that would recreate this person in the following style:

${promptTemplate}

Your response must be ONLY the prompt, nothing else. Include:
- Physical description (face shape, skin tone, hair color/style, eye color)
- The style/scenario from the template
- Professional photography details (lighting, composition)
- Maximum 200 words`

    const result = await model.generateContent([
        analysisPrompt,
        ...imageParts
    ])

    return result.response.text().trim()
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
