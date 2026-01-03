import 'dotenv/config'

async function testHybridApproach() {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_UPSCALE_ENDPOINT_ID = process.env.RUNPOD_UPSCALE_ENDPOINT_ID || "eyoku6bop62rtq"

    // Imagem de teste 1x1 pixel
    const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    console.log("🧪Testando abordagens híbridas\n")

    // Teste 1: image_base64 + workflow simplificado
    console.log("=== Teste 1: image_base64 + workflow type ===")
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
                    workflow_type: "upscale",
                    scale: 2,
                }
            }),
        })
        const data1 = await res1.json()
        console.log("Status:", res1.status)
        if (data1.status === "COMPLETED") {
            console.log("✅ Sucesso!")
            console.log("Output keys:", Object.keys(data1.output || {}))
        } else {
            console.log("Status:", data1.status)
            console.log("Erro:", data1.error ? data1.error.substring(0, 150) : "nenhum")
        }
        console.log()
    } catch (e) {
        console.error("Erro:", e)
    }

    // Teste 2: image_base64 + prompt vazio
    console.log("=== Teste 2: image_base64 + prompt object ===")
    try {
        const res2 = await fetch(`https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/runsync`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input: {
                    image_base64: testImage,
                    prompt: {
                        "workflow": "upscale",
                        "scale": 2
                    }
                }
            }),
        })
        const data2 = await res2.json()
        console.log("Status:", res2.status)
        if (data2.status === "COMPLETED") {
            console.log("✅ Sucesso!")
            console.log("Output keys:", Object.keys(data2.output || {}))
        } else {
            console.log("Status:", data2.status)
            console.log("Erro:", data2.error ? data2.error.substring(0, 150) : "nenhum")
        }
        console.log()
    } catch (e) {
        console.error("Erro:", e)
    }

    // Teste 3: Apenas image_base64 (mais simples possível)
    console.log("=== Teste 3: Apenas image_base64 (verificar handler) ===")
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
                }
            }),
        })
        const data3 = await res3.json()
        console.log("Status:", res3.status)
        console.log("Response:", JSON.stringify(data3, null, 2))
    } catch (e) {
        console.error("Erro:", e)
    }
}

testHybridApproach()
