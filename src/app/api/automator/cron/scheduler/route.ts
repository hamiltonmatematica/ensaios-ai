import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VideoOrchestrator } from "@/lib/automator/engine/orchestrator";
import { generateScript } from "@/lib/automator/engine/script-generator";

// Endpoint para ser chamado por Cron Job (ex: Vercel Cron, GitHub Actions, ou curl local)
export async function GET(req: Request) {
    try {
        // 1. Verificar autenticação do Cron (Opcional: Header Authorization)
        // const authHeader = req.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { return new NextResponse('Unauthorized', { status: 401 }); }

        console.log("⏰ Iniciando rotina autônoma...");

        // 2. Buscar canais autônomos que precisam rodar
        const now = new Date();
        const channels = await prisma.autoChannel.findMany({
            where: {
                isAutonomous: true,
                OR: [
                    { nextRunAt: { lte: now } },
                    { nextRunAt: null } // Primeira execução
                ]
            }
        });

        console.log(`🔎 Encontrados ${channels.length} canais para processar.`);

        const results = [];

        for (const channel of channels) {
            try {
                // Lógica de Autonomia:
                // 1. Gerar Ideia
                // 2. Criar Tópico
                // 3. Disparar Produção
                // 4. Agendar próxima execução

                // TODO: Usar IA para gerar ideia baseada no nicho
                const ideaPrompt = `Gere uma única ideia de vídeo viral para um canal sobre "${channel.description || channel.name}". Retorne apenas o título.`;
                // Mock rápido ou usar OpenAI
                // const idea = await openai... (simplificando para MVP: usar título genérico + data)
                const ideaTitle = `Vídeo Automático: ${channel.name} - ${new Date().toLocaleDateString()}`;

                // Criar Tópico
                const topic = await prisma.topic.create({
                    data: {
                        channelId: channel.id,
                        title: ideaTitle,
                        status: "PENDING",
                        priority: 1
                    }
                });

                // Disparar Produção
                VideoOrchestrator.processTopic(topic.id).catch(console.error);

                // Agendar Próxima Execução
                // postsPerDay = 1 -> a cada 24h
                // postsPerDay = 2 -> a cada 12h
                const intervalHours = 24 / (channel.postsPerDay || 1);
                const nextRun = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

                await prisma.autoChannel.update({
                    where: { id: channel.id },
                    data: {
                        lastRunAt: now,
                        nextRunAt: nextRun
                    }
                });

                results.push({ channelId: channel.id, createdTopic: topic.id, nextRun });

            } catch (err) {
                console.error(`Erro no canal ${channel.id}:`, err);
            }
        }

        return NextResponse.json({ success: true, processed: results });

    } catch (error) {
        console.error("Erro no Scheduler:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
