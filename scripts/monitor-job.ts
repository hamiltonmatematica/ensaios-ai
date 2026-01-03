import 'dotenv/config'

async function monitorJob() {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "eyoku6bop62rtq"

    const jobId = "f1196f54-ba38-42cd-a4f8-563e2dca792d-u2" // Do teste anterior

    console.log(`Monitorando job ${jobId}...\n`)

    for (let i = 0; i < 10; i++) {
        const statusRes = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/status/${jobId}`,
            {
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                },
            }
        )

        const data = await statusRes.json()
        console.log(`[${i}] Status: ${data.status}`)

        if (data.status === "COMPLETED") {
            console.log("\n✅ Completado!")
            console.log("Output:", JSON.stringify(data.output, null, 2))
            break
        } else if (data.status === "FAILED") {
            console.log("\n❌ Falhou!")
            console.log("Error:", data.error)
            break
        }

        await new Promise(resolve => setTimeout(resolve, 2000))
    }
}

monitorJob()
