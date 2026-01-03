import 'dotenv/config'

async function testMultipleFormats() {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "eyoku6bop62rtq"

    // Imagem de teste 1x1 pixel
    const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    console.log("🧪 Testando múltiplos formatos de parâmetros\n")

    // Teste 1: Apenas image_base64 e scale
    console.log("=== Teste 1: image_base64 + scale ===")
    try {
        const res1 = await fetch(`https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/runsync`, {
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
        })
        const data1 = await res1.json()
        console.log("Status:", res1.status)
        console.log("Erro:", data1.error || "nenhum")
        console.log()
    } catch (e) {
        console.error("Erro:", e)
    }

    // Teste 2: Workflow ComfyUI básico
    console.log("=== Teste 2: ComfyUI workflow format ===")
    try {
        const res2 = await fetch(`https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/runsync`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input: {
                    workflow: {
                        image_base64: testImage,
                        scale: 2,
                    }
                }
            }),
        })
        const data2 = await res2.json()
        console.log("Status:", res2.status)
        console.log("Erro:", data2.error ? data2.error.substring(0, 100) : "nenhum")
        console.log()
    } catch (e) {
        console.error("Erro:", e)
    }

    // Teste 3: Formato com model name
    console.log("=== Teste 3: image_base64 + scale + model ===")
    try {
        const res3 = await fetch(`https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/runsync`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input: {
                    image_base64: testImage,
                    scale: 2,
                    model: "RealESRGAN_x2plus"
                }
            }),
        })
        const data3 = await res3.json()
        console.log("Status:", res3.status)
        console.log("Erro:", data3.error ? data3.error.substring(0, 100) : "nenhum")
        console.log()
    } catch (e) {
        console.error("Erro:", e)
    }

    // Teste 4: Chamada assíncrona /run
    console.log("=== Teste 4: Async /run ===")
    try {
        const res4 = await fetch(`https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/run`, {
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
        })
        const data4 = await res4.json()
        console.log("Status:", res4.status)
        console.log("Response:", JSON.stringify(data4, null, 2))
    } catch (e) {
        console.error("Erro:", e)
    }
}

testMultipleFormats()
