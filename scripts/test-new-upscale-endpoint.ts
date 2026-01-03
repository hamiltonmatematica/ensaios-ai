import 'dotenv/config'

async function testNewEndpoint() {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_UPSCALE_ENDPOINT_ID = "qqx0my03hxzi5k"

    // Imagem de teste 1x1 pixel
    const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    console.log("🧪 Testando novo endpoint Real-ESRGAN")
    console.log(`Endpoint ID: ${RUNPOD_UPSCALE_ENDPOINT_ID}`)
    console.log(`URL: https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/run\n`)

    try {
        console.log("Enviando requisição...")
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
                        image_base64: testImage,
                        scale: 2,
                    }
                }),
            }
        )

        console.log(`Status: ${response.status}`)
        const data = await response.json()
        console.log("Response:", JSON.stringify(data, null, 2))

        if (data.id && data.status === "IN_QUEUE") {
            console.log("\n✅ Job criado com sucesso!")
            console.log("Job ID:", data.id)
            console.log("\nMonitorando processamento...")

            // Monitorar até completar ou falhar
            for (let i = 0; i < 60; i++) {
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
                    console.log("Output structure:", Object.keys(statusData.output || {}))
                    if (statusData.output?.image) {
                        console.log("✅ Imagem retornada (primeiros 50 chars):")
                        console.log(statusData.output.image.substring(0, 50))
                    }
                    break
                } else if (statusData.status === "FAILED") {
                    console.log("\n❌ Job falhou!")
                    console.log("Error:", statusData.error)
                    break
                }
            }
        } else {
            console.log("\n❌ Resposta inesperada do endpoint")
        }

    } catch (error) {
        console.error("\n❌ Erro:", error)
    }
}

testNewEndpoint()
