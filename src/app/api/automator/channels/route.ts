import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    try {
        // TODO: Get userId from session
        // For now using first user
        const user = await prisma.user.findFirst()

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const channels = await prisma.autoChannel.findMany({
            where: { userId: user.id },
            include: {
                _count: {
                    select: { posts: true }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(channels)
    } catch (error) {
        console.error("Error fetching channels:", error)
        return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // TODO: Get userId from session
        const user = await prisma.user.findFirst()
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const channel = await prisma.autoChannel.create({
            data: {
                userId: user.id,
                name: body.name,
                slug: body.slug,
                description: body.description,
                type: body.type,
                platform: body.platform,
                language: body.language,
                voiceId: body.voiceId,
                avatarConfig: body.avatarConfig || {},
                visualStylePrompt: body.visualStylePrompt,
                musicFolderId: body.musicFolderId,
                qtdImages: body.qtdImages || 5,
                googleDriveFolder: body.googleDriveFolder,
                googleSpreadsheet: body.googleSpreadsheet,
                youtubeChannelId: body.youtubeChannelId
            }
        })

        return NextResponse.json(channel, { status: 201 })
    } catch (error: any) {
        console.error("Error creating channel:", error)

        if (error.code === "P2002") {
            return NextResponse.json({ error: "Slug já existe" }, { status: 400 })
        }

        return NextResponse.json({ error: "Failed to create channel" }, { status: 500 })
    }
}
