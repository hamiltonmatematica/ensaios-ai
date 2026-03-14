import Replicate from "replicate";
import fs from "fs";
import path from "path";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { getUserApiKeys } from "@/lib/automator/api-keys";

export async function generateImages(
    prompts: string[],
    context?: { userId?: string; apiKey?: string }
): Promise<string[]> {
    let apiKey = context?.apiKey;

    if (!apiKey && context?.userId) {
        const keys = await getUserApiKeys(context.userId);
        apiKey = keys.replicateKey || undefined;
    }

    if (!apiKey) {
        apiKey = process.env.REPLICATE_API_KEY;
    }

    if (!apiKey) {
        throw new Error("REPLICATE_API_KEY não configurada.");
    }

    const replicate = new Replicate({ auth: apiKey });

    console.log(`🎨 Gerando ${prompts.length} imagens com Flux Schnell...`);
    const imageUrls: string[] = [];
    const publicDir = path.join(process.cwd(), "public/images");

    // Garantir diretório
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    for (const prompt of prompts) {
        try {
            console.log(`Generating: "${prompt.substring(0, 30)}..."`);

            const output = await replicate.run(
                "black-forest-labs/flux-schnell",
                {
                    input: {
                        prompt: prompt,
                        num_outputs: 1,
                        aspect_ratio: "16:9",
                        output_format: "webp",
                        output_quality: 90,
                    },
                }
            ) as string[]; // Cast response

            if (output && output[0]) {
                // Baixar imagem
                const imageUrl = output[0];
                const fileName = `${uuidv4()}.webp`;
                const filePath = path.join(publicDir, fileName);

                const response = await axios({
                    url: imageUrl,
                    method: "GET",
                    responseType: "stream",
                });

                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on("finish", () => resolve(null));
                    writer.on("error", reject);
                });

                imageUrls.push(`/images/${fileName}`);
            }
        } catch (error) {
            console.error(`Erro ao gerar imagem para prompt "${prompt}":`, error);
            // Continua para o próximo prompt mesmo com erro
        }
    }

    return imageUrls;
}
