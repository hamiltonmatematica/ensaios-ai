import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getUserApiKeys } from "@/lib/automator/api-keys";

export async function generateVoice(
    text: string,
    voiceId: string | undefined,
    context?: { userId?: string; apiKey?: string }
): Promise<string> {
    let apiKey = context?.apiKey;

    if (!apiKey && context?.userId) {
        const keys = await getUserApiKeys(context.userId);
        apiKey = keys.elevenlabsKey || undefined;
    }

    // Fallback to env if not found
    if (!apiKey) {
        apiKey = process.env.ELEVENLABS_API_KEY;
    }

    if (!apiKey) {
        throw new Error("ELEVENLABS_API_KEY não configurada.");
    }

    const elevenlabs = new ElevenLabsClient({ apiKey });

    if (!voiceId) {
        throw new Error("Voice ID não fornecido.");
    }

    console.log(`🎙️ Gerando áudio com voz: ${voiceId}`);

    try {
        const audioStream = await elevenlabs.generate({
            voice: voiceId,
            text: text,
            model_id: "eleven_multilingual_v2",
        });

        // Salvar o arquivo de áudio localmente
        const fileName = `${uuidv4()}.mp3`;
        const publicDir = path.join(process.cwd(), "public/audio");

        // Garantir que diretório existe
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, fileName);
        const fileStream = fs.createWriteStream(filePath);

        audioStream.pipe(fileStream);

        return new Promise((resolve, reject) => {
            fileStream.on("finish", () => {
                console.log(`✅ Áudio salvo em: ${filePath}`);
                resolve(`/audio/${fileName}`); // Retorna caminho relativo para URL
            });
            fileStream.on("error", reject);
        });

    } catch (error) {
        console.error("Erro ao gerar voz:", error);
        throw error;
    }
}
