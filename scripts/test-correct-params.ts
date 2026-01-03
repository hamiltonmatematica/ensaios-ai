import 'dotenv/config'

async function testWithCorrectParams() {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_UPSCALE_ENDPOINT_ID = "qqx0my03hxzi5k"

    // Imagem de teste 1x1 pixel
    const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    console.log("🧪 Testando com parâmetros corretos (source_image)\n")

    try {
        const response = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/run`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        source_image: testImage,
                        scale: 2,
                    }
                }),
            }
        )

        const data = await response.json()
        console.log("Job criado:", data.id)
        console.log("Status inicial:", data.status)

        // Monitorar
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 3000))

            const statusRes = await fetch(
                `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/status/${data.id}`,
                {
                    headers: {
                        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                    },
                }
            )

            const statusData = await statusRes.json()
            console.log(`[${i * 3}s] Status: ${statusData.status}`)

            if (statusData.status === "COMPLETED") {
                console.log("\n✅ UPSCALE COMPLETADO!")
                console.log("Full output:", JSON.stringify(statusData.output, null, 2))
                break
            } else if (statusData.status === "FAILED") {
                console.log("\n❌ Job falhou!")
                console.log("Error:", statusData.output || statusData.error)
                break
            }
        }

    } catch (error) {
        console.error("\n❌ Erro:", error)
    }
}

testWithCorrectParams()
