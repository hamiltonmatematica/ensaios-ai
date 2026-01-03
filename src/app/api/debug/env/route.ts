import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({
        env_check: {
            RUNPOD_API_KEY: process.env.RUNPOD_API_KEY ? "Defined (Starts with " + process.env.RUNPOD_API_KEY.substring(0, 4) + ")" : "Missing",
            RUNPOD_UPSCALER_ID: process.env.RUNPOD_UPSCALER_ID || "Missing",
            RUNPOD_COMFYUI_ID: process.env.RUNPOD_COMFYUI_ID || "Missing",
            RUNPOD_FLUX_ENDPOINT_ID: process.env.RUNPOD_FLUX_ENDPOINT_ID || "Missing",
            RUNPOD_VIRTUAL_TRY_ON_ID: process.env.RUNPOD_VIRTUAL_TRY_ON_ID || "Missing",
            NODE_ENV: process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString()
    })
}
