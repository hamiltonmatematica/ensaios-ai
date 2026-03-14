import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { postId, step, status, data, error } = body

        if (!postId) {
            return NextResponse.json({ error: "postId is required" }, { status: 400 })
        }

        const post = await prisma.autoPost.findUnique({
            where: { id: postId },
            include: { topic: true }
        })

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 })
        }

        // Determinar novo status baseado no step
        let newStatus = post.status
        let topicStatus = post.topic?.status

        if (status === "error") {
            newStatus = "FAILED"
            topicStatus = "FAILED"
        } else {
            switch (step) {
                case "script_done":
                    newStatus = "GENERATING"
                    break
                case "images_done":
                    newStatus = "GENERATING"
                    break
                case "video_done":
                    newStatus = "READY"
                    topicStatus = "COMPLETED"
                    break
            }
        }

        // Atualizar post
        await prisma.autoPost.update({
            where: { id: postId },
            data: {
                status: newStatus,
                currentStep: step,
                scriptContent: data?.scriptContent || post.scriptContent,
                videoUrl: data?.videoUrl || post.videoUrl,
                thumbnailUrl: data?.thumbnailUrl || post.thumbnailUrl,
                duration: data?.duration || post.duration,
                errorMessage: error || null,
                ...(step === "video_done" && { processedAt: new Date() })
            }
        })

        // Atualizar tópico se aplicável
        if (post.topicId && topicStatus) {
            await prisma.topic.update({
                where: { id: post.topicId },
                data: { status: topicStatus }
            })
        }

        // TODO: Enviar notificação em tempo real via WebSocket ou Server-Sent Events

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error processing n8n webhook:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
