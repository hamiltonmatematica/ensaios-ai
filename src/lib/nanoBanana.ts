
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

    // Usar gemini-2.0-flash-exp para análise de imagens e geração de texto
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
    })

    const apiAspectRatio = ASPECT_RATIO_MAP[aspectRatio] || '3:4'

    // Prepara as imagens de referência
    const imageParts = referenceImages.slice(0, 3).map((base64Data) => {
        const cleanBase64 = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data

        // Detecta o mimeType
        const mimeMatch = base64Data.match(/data:([^;]+);/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'

        return {
            inlineData: {
                data: cleanBase64,
                mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
            },
        }
    })

    // Prompt para análise das fotos e geração de descrição
    const analysisPrompt = `Analyze these reference photos of a person carefully. Then create a detailed image generation prompt in English that would recreate this person in the following style/scenario:

${promptTemplate}

Important instructions:
- Describe the person's key facial features, skin tone, hair color and style
- Apply the style/scenario from the template above
- Output ONLY the image generation prompt, nothing else
- The prompt should be detailed enough for an AI image generator
- Aspect ratio will be ${apiAspectRatio}`

    try {
        // Primeiro: analisa as fotos e gera um prompt detalhado
        const analysisResult = await model.generateContent([
            analysisPrompt,
            ...imageParts
        ])

        const generatedPrompt = analysisResult.response.text()
        console.log("Generated prompt:", generatedPrompt)

        // Agora usa Imagen 3 para gerar a imagem
        // Nota: Imagen 3 requer configuração específica
        const imagenModel = genAI.getGenerativeModel({
            model: "imagen-3.0-generate-002"
        })

        const imageResult = await imagenModel.generateContent({
            contents: [{ role: "user", parts: [{ text: generatedPrompt }] }],
            generationConfig: {
                // @ts-expect-error - Imagen specific config
                responseModalities: ["image", "text"],
                responseMimeType: "image/png",
            },
        })

        const response = imageResult.response

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

        throw new Error("Imagen não retornou uma imagem. Verifique se sua API key tem acesso ao Imagen 3.")

    } catch (error: unknown) {
        console.error("Erro na geração:", error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        throw new Error(`Falha na geração de imagem: ${errorMessage}`)
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
