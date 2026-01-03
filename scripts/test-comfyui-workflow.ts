import 'dotenv/config'

async function testComfyUIWorkflow() {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "eyoku6bop62rtq"

    // Imagem de teste 1x1 pixel
    const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    // ComfyUI Workflow básico para upscale
    const workflow = {
        "1": {
            "class_type": "LoadImageBase64",
            "inputs": {
                "image": testImage
            }
        },
        "2": {
            "class_type": "UpscaleModelLoader",
            "inputs": {
                "model_name": "RealESRGAN_x2plus.pth"
            }
        },
        "3": {
            "class_type": "ImageUpscaleWithModel",
            "inputs": {
                "upscale_model": ["2", 0],
                "image": ["1", 0]
            }
        },
        "4": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["3", 0],
                "filename_prefix": "upscaled"
            }
        }
    }

    console.log("🧪 Testando ComfyUI Workflow para upscale\n")
    console.log("Workflow:", JSON.stringify(workflow, null, 2))
    console.log()

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
                        workflow: workflow
                    }
                }),
            }
        )

        const data = await response.json()
        console.log("Status:", response.status)
        console.log("Response:", JSON.stringify(data, null, 2))

        if (data.id && data.status === "IN_QUEUE") {
            console.log("\n✅ Job aceito! ID:", data.id)
            console.log("Monitorando...")

            // Monitorar o job
            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000))

                const statusRes = await fetch(
                    `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/status/${data.id}`,
                    {
                        headers: {
                            "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                        },
                    }
                )

                const statusData = await statusRes.json()
                console.log(`[${i}] Status: ${statusData.status}`)

                if (statusData.status === "COMPLETED") {
                    console.log("\n✅ Completado!")
                    console.log("Output:", JSON.stringify(statusData.output, null, 2))
                    break
                } else if (statusData.status === "FAILED") {
                    console.log("\n❌ Falhou!")
                    console.log("Error:", statusData.error)
                    break
                }
            }
        }

    } catch (error) {
        console.error("\n❌ Erro:", error)
    }
}

testComfyUIWorkflow()
