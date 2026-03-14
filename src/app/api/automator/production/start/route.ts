import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { VideoOrchestrator } from "@/lib/automator/engine/orchestrator"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { topicIds } = body

        if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
            return NextResponse.json({ error: "No topics provided" }, { status: 400 })
        }

        const results = []

        for (const topicId of topicIds) {
            // Verificar se tópico exists
            const topic = await prisma.topic.findUnique({
                where: { id: topicId },
                include: { channel: true }
            })

            if (!topic) continue

            // Iniciar processamento em background
            // Nota: Em serverless (Vercel), funções background precisam de tratamento especial (Inngest, QStash).
            // Em servidor Node.js padrão (VPS, local), isso funciona.
            VideoOrchestrator.processTopic(topicId).catch(err =>
                console.error(`Erro em background do tópico ${topicId}:`, err)
            );

            results.push({
                topicId,
                status: "STARTED",
                message: "Processamento iniciado pela Engine Nativa"
            })
        }

        return NextResponse.json({
            success: true,
            message: "Produção iniciada com sucesso (Engine Nativa)",
            data: results
        })

    } catch (error) {
        console.error("Error starting production:", error)
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
