"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const apiKeysSchema = z.object({
    openaiKey: z.string().optional(),
    replicateKey: z.string().optional(),
    elevenlabsKey: z.string().optional(),
    heygenKey: z.string().optional(),
});

export type ApiKeyInput = z.infer<typeof apiKeysSchema>;

export async function updateUserApiKeys(data: ApiKeyInput) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Validate
    const validated = apiKeysSchema.parse(data);

    await prisma.userApiConfig.upsert({
        where: { userId },
        create: {
            userId,
            ...validated
        },
        update: {
            ...validated
        }
    });

    revalidatePath("/automator/settings");
    return { success: true };
}
