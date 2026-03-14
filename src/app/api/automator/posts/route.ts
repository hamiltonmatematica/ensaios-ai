
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { title, script, description, tags } = body

        // Get first user (TODO: usar sessão real)
        const user = await prisma.user.findFirst()

        if (!user) {
            return NextResponse.json({ error: "No user found in DB. Please seed users." }, { status: 400 })
        }

        // We also need a Channel. If not provided, find first or create default?
        // Let's assume we create a default channel if none exists.
        let channel = await prisma.autoChannel.findFirst({
            where: { userId: user.id }
        })

        if (!channel) {
            channel = await prisma.autoChannel.create({
                data: {
                    name: "Default Channel",
                    slug: "default-channel",
                    type: "AVATAR",
                    platform: "YOUTUBE",
                    language: "pt-BR",
                    userId: user.id
                }
            })
        }

        const post = await prisma.autoPost.create({
            data: {
                title,
                description,
                tags: tags || [],
                status: "DRAFT", // Initial status
                scriptContent: script,
                channelId: channel.id,
                userId: user.id
            },
        })

        return NextResponse.json(post)
    } catch (error) {
        console.error("Error creating post:", error)
        return NextResponse.json(
            { error: "Error creating post" },
            { status: 500 }
        )
    }
}
