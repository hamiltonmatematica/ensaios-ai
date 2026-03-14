import OpenAI from "openai";
import { getUserApiKeys } from "@/lib/automator/api-keys";

interface ScriptData {
    title: string;
    script: string;
    imagePrompts: string[];
    description: string;
    tags: string[];
}

export async function generateScript(
    topic: string,
    channelName: string,
    channelType: "AVATAR" | "DARK_CHANNEL",
    context?: { userId?: string; apiKey?: string }
): Promise<ScriptData> {
    let apiKey = context?.apiKey;

    if (!apiKey && context?.userId) {
        const keys = await getUserApiKeys(context.userId);
        apiKey = keys.openaiKey || undefined;
    }

    if (!apiKey) {
        apiKey = process.env.OPENAI_API_KEY;
    }

    const openai = new OpenAI({
        apiKey: apiKey,
    });

    console.log(`📝 Gerando roteiro para: ${topic} (${channelType})`);

    const systemPrompt = `
    Você é um roteirista profissional para YouTube e redes sociais.
    Seu objetivo é criar um roteiro altamente engajador para o canal "${channelName}".
    
    Tipo de Canal: ${channelType === "AVATAR" ? "Apresentador Virtual (fala direta)" : "Dark Channel (narração com imagens de fundo)"}
    
    Retorne APENAS um JSON válido com a seguinte estrutura:
    {
      "title": "Título chamativo (Clickbait ético)",
      "script": "O texto completo que será falado/narrado via TTS. Use linguagem natural, pausas (...) e emoção.",
      "imagePrompts": ["Prompt visual para cena 1", "Prompt visual para cena 2", ...], // Mínimo 5 prompts para Dark Channel
      "description": "Descrição otimizada para SEO do vídeo",
      "tags": ["tag1", "tag2", "tag3", ...]
    }

    Se for Dark Channel, os prompts visuais devem ser descritivos e artísticos (ex: "cinematic shot of...").
    Se for Avatar, os prompts podem ser ignorados ou usados para B-Roll.
  `;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Tema do vídeo: ${topic}` },
        ],
        response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Falha ao gerar roteiro: Resposta vazia da OpenAI");

    return JSON.parse(content) as ScriptData;
}
