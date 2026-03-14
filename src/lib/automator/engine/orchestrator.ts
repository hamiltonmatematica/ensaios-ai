import { prisma } from "@/lib/prisma";
import { generateScript } from "@/lib/automator/engine/script-generator";
import { generateVoice } from "@/lib/automator/engine/voice-generator";
import { generateImages } from "@/lib/automator/engine/image-generator";
import { renderVideo } from "@/lib/automator/engine/video-renderer";
import fs from "fs";
import path from "path";
import getMP3Duration from "get-mp3-duration"; // Instalar esta lib

export class VideoOrchestrator {

    static async processTopic(topicId: string) {
        console.log(`🚀 Iniciando processamento do tópico: ${topicId}`);

        try {
            // 1. Buscar dados
            const topic = await prisma.topic.findUnique({
                where: { id: topicId },
                include: { channel: true }
            });

            if (!topic) throw new Error("Tópico não encontrado");

            const userId = topic.channel.userId; // Capturar userId para contexto

            // Atualizar status para PROCESSING
            await prisma.topic.update({
                where: { id: topicId },
                data: { status: "PROCESSING" }
            });

            // Criar Post (se não existir)
            let post = await prisma.autoPost.findUnique({
                where: { topicId: topicId }
            });

            if (!post) {
                post = await prisma.autoPost.create({
                    data: {
                        topicId: topicId,
                        channelId: topic.channelId,
                        userId: userId,
                        title: topic.title,
                        status: "GENERATING",
                        currentStep: "starting"
                    }
                });
            }

            // --- PASSO 1: ROTEIRO ---
            await this.updateStatus(post.id, "generating_script");
            const scriptData = await generateScript(
                topic.title,
                topic.channel.name,
                topic.channel.type,
                { userId }
            );

            await prisma.autoPost.update({
                where: { id: post.id },
                data: {
                    title: scriptData.title,
                    description: scriptData.description,
                    tags: scriptData.tags,
                    scriptContent: scriptData.script,
                    workflowData: { imagePrompts: scriptData.imagePrompts } // Salvar prompts
                }
            });

            let videoUrl = "";
            let duration = 0;

            // --- PASSO 2: MÍDIA ---
            {
                // DARK CHANNEL
                await this.updateStatus(post.id, "generating_audio");

                // 2a. Voz
                const audioPathRelative = await generateVoice(
                    scriptData.script,
                    topic.channel.voiceId || "21m00Tcm4TlvDq8ikWAM",
                    { userId }
                );
                const audioPathFull = path.join(process.cwd(), "public", audioPathRelative);

                // Calcular duração do áudio
                const buffer = fs.readFileSync(audioPathFull);
                duration = getMP3Duration(buffer) / 1000;

                // 2b. Imagens
                await this.updateStatus(post.id, "generating_images");
                const prompts = scriptData.imagePrompts || [];
                // Se não tiver prompts suficientes, duplicar ou gerar genéricos
                while (prompts.length < 5) prompts.push(`Cinematic shot related to ${topic.title}`);

                const imagePaths = await generateImages(
                    prompts.slice(0, Math.ceil(duration / 5)), // 1 img a cada 5s aprox
                    { userId }
                );

                // 2c. Renderização
                await this.updateStatus(post.id, "rendering_video");
                videoUrl = await renderVideo(audioPathRelative, imagePaths, duration);
            }

            // --- FINALIZAR ---
            await prisma.autoPost.update({
                where: { id: post.id },
                data: {
                    status: "READY", // Pronto para revisão
                    currentStep: "completed",
                    videoUrl: videoUrl,
                    duration: Math.round(duration),
                    processedAt: new Date()
                }
            });

            await prisma.topic.update({
                where: { id: topicId },
                data: { status: "COMPLETED" }
            });

            console.log(`✅ Processamento concluído para tópico: ${topicId}`);

        } catch (error: any) {
            console.error(`❌ Erro no processamento do tópico ${topicId}:`, error);

            // Atualizar status de erro
            await prisma.topic.update({
                where: { id: topicId },
                data: { status: "FAILED" }
            });

            // Tentar atualizar post se existir
            const post = await prisma.autoPost.findUnique({ where: { topicId: topicId } });
            if (post) {
                await prisma.autoPost.update({
                    where: { id: post.id },
                    data: {
                        status: "FAILED",
                        errorMessage: error.message || "Unknown error",
                        currentStep: "failed"
                    }
                });
            }
        }
    }

    private static async updateStatus(postId: string, step: string) {
        await prisma.autoPost.update({
            where: { id: postId },
            data: { currentStep: step }
        });
    }
}
