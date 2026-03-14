import { prisma } from "@/lib/prisma";

export interface ApiKeys {
    openaiKey?: string | null;
    replicateKey?: string | null;
    elevenlabsKey?: string | null;
    heygenKey?: string | null;
}

export async function getUserApiKeys(userId: string): Promise<ApiKeys> {
    const config = await prisma.userApiConfig.findUnique({
        where: { userId },
    });

    return {
        openaiKey: config?.openaiKey || process.env.OPENAI_API_KEY,
        replicateKey: config?.replicateKey || process.env.REPLICATE_API_KEY,
        elevenlabsKey: config?.elevenlabsKey || process.env.ELEVENLABS_API_KEY,
        heygenKey: config?.heygenKey || process.env.HEYGEN_API_KEY,
    };
}
