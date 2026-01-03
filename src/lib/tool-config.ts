/**
 * Tool configuration and credit costs
 * Centralized source of truth for all AI tools
 */

export interface ToolConfig {
    slug: string
    name: string
    description: string
    credits: number
    endpoint?: string
}

export const TOOL_CONFIG = {
    AI_PHOTO: {
        slug: "ai-photo",
        name: "Ensaio de IA",
        description: "Ensaio profissional com suas fotos",
        credits: 25,
        endpoint: process.env.RUNPOD_ENDPOINT_ID, // Nano Banana
    },
    FACE_SWAP: {
        slug: "face-swap",
        name: "Face Swap",
        description: "Troque rostos em imagens",
        credits: 5,
        endpoint: process.env.RUNPOD_ENDPOINT_ID,
    },
    UPSCALE: {
        slug: "upscale",
        name: "Upscale Imagem",
        description: "Aumente resolução até 4x",
        credits: 10,
        endpoint: process.env.RUNPOD_UPSCALER_ID,
    },
    VIRTUAL_TRYON: {
        slug: "virtual-tryon",
        name: "Provador Virtual",
        description: "Prove roupas com IA",
        credits: 20,
        endpoint: process.env.RUNPOD_VIRTUAL_TRY_ON_ID,
    },
} as const

export type ToolSlug = keyof typeof TOOL_CONFIG

/**
 * Get tool configuration by slug
 */
export function getToolConfig(slug: string): ToolConfig | undefined {
    const key = Object.keys(TOOL_CONFIG).find(
        k => TOOL_CONFIG[k as ToolSlug].slug === slug
    )
    return key ? TOOL_CONFIG[key as ToolSlug] : undefined
}

/**
 * Get credit cost for a tool
 */
export function getToolCredits(slug: ToolSlug): number {
    return TOOL_CONFIG[slug].credits
}
