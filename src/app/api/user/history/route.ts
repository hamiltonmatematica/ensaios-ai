import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type") || "image-generation"
        const limit = 20

        let data = []

        switch (type) {
            case "image-generation":
                const images = await prisma.imageGeneration.findMany({
                    where: {
                        userId: session.user.id,
                        OR: [
                            { status: "completed" },
                            { status: "COMPLETED" },
                            { status: "succeeded" }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit
                })
                data = images.map(item => ({
                    id: item.id,
                    type: "image-generation",
                    originalUrl: null, // Prompt based
                    resultUrl: item.resultUrl,
                    status: item.status,
                    createdAt: item.createdAt,
                    details: item.prompt
                }))
                break

            case "upscale":
                const upscales = await prisma.imageUpscale.findMany({
                    where: {
                        userId: session.user.id,
                        OR: [
                            { status: "completed" },
                            { status: "COMPLETED" },
                            { status: "ok" }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit
                })
                data = upscales.map(item => ({
                    id: item.id,
                    type: "upscale",
                    originalUrl: item.imageUrl,
                    resultUrl: item.resultUrl,
                    status: item.status,
                    createdAt: item.createdAt,
                    details: `${item.scale} Upscale`
                }))
                break

            case "face-swap":
                const swaps = await prisma.faceSwapJob.findMany({
                    where: {
                        userId: session.user.id,
                        OR: [
                            { status: "COMPLETED" },
                            { status: "completed" }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit
                })
                data = swaps.map(item => ({
                    id: item.id,
                    type: "face-swap",
                    originalUrl: item.targetImage, // Imagem alvo
                    resultUrl: item.resultImage,
                    status: item.status,
                    createdAt: item.createdAt,
                    details: "Face Swap"
                }))
                break

            case "inpaint":
                const inpaints = await prisma.inpaint.findMany({
                    where: {
                        userId: session.user.id,
                        OR: [
                            { status: "completed" },
                            { status: "COMPLETED" }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit
                })
                data = inpaints.map(item => ({
                    id: item.id,
                    type: "inpaint",
                    originalUrl: item.imageUrl,
                    resultUrl: item.resultUrl,
                    status: item.status,
                    createdAt: item.createdAt,
                    details: "Inpaint / Remove"
                }))
                break

            case "virtual-try-on":
                const tryons = await prisma.virtualTryOn.findMany({
                    where: {
                        userId: session.user.id,
                        OR: [
                            { status: "completed" },
                            { status: "COMPLETED" }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit
                })
                data = tryons.map(item => ({
                    id: item.id,
                    type: "virtual-try-on",
                    originalUrl: item.personImageUrl,
                    resultUrl: item.resultUrl,
                    status: item.status,
                    createdAt: item.createdAt,
                    details: `${item.category} Try-On`
                }))
                break

            default:
                return NextResponse.json({ error: "Invalid type" }, { status: 400 })
        }

        return NextResponse.json({ items: data })

    } catch (error) {
        console.error("History error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
