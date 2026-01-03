import 'dotenv/config'

async function testRunPodRun() {
    const apiKey = process.env.RUNPOD_API_KEY
    const endpointId = process.env.RUNPOD_UPSCALER_ID

    if (!apiKey || !endpointId) {
        console.error("Configuração ausente")
        return
    }

    console.log(`Testando execução no endpoint: ${endpointId}`)

    // Imagem 1x1 pixel preta em base64
    const dummyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP6DwABBAEAAAAA1wAAAABJRU5ErkJggg=="

    try {
        const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: {
                    image: dummyImage
                }
            })
        })

        console.log(`Status HTTP: ${res.status}`)
        const text = await res.text()
        console.log(`Resposta: ${text}`)

    } catch (e) {
        console.error("Erro:", e)
    }
}

testRunPodRun()
