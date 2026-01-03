import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

/**
 * Rota de proxy para servir imagens geradas pelo RunPod
 * Resolve problemas de CORS ao acessar URLs externas diretamente
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Não autorizado" },
                { status: 401 }
            )
        }

        const searchParams = request.nextUrl.searchParams
        const imageUrl = searchParams.get("url")

        if (!imageUrl) {
            return NextResponse.json(
                { error: "URL da imagem não fornecida" },
                { status: 400 }
            )
        }

        // Validar que a URL é válida
        try {
            new URL(imageUrl)
        } catch {
            return NextResponse.json(
                { error: "URL inválida" },
                { status: 400 }
            )
        }

        console.log("Proxying image from:", imageUrl)

        // Fazer fetch da imagem
        const imageResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Ensaios.AI/1.0',
            },
        })

        if (!imageResponse.ok) {
            console.error("Failed to fetch image:", imageResponse.status)
            return NextResponse.json(
                { error: "Falha ao buscar imagem" },
                { status: imageResponse.status }
            )
        }

        // Obter o buffer da imagem
        const imageBuffer = await imageResponse.arrayBuffer()

        // Determinar o tipo de conteúdo
        const contentType = imageResponse.headers.get("content-type") || "image/png"

        // Retornar a imagem com os headers corretos
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "Access-Control-Allow-Origin": "*",
            },
        })

    } catch (error) {
        console.error("Error proxying image:", error)
        return NextResponse.json(
            { error: "Erro ao carregar imagem" },
            { status: 500 }
        )
    }
}
