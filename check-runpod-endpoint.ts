import 'dotenv/config'

async function checkRunpodEndpoint() {
    const apiKey = process.env.RUNPOD_API_KEY
    const endpointId = process.env.RUNPOD_UPSCALER_ID

    console.log("🔍 Verificando configuração do endpoint RunPod\n")
    console.log(`Endpoint ID: ${endpointId}`)
    console.log(`API Key presente: ${!!apiKey}\n`)

    // Tentar health check
    try {
        console.log("📡 Fazendo health check...")
        const healthRes = await fetch(`https://api.runpod.ai/v2/${endpointId}/health`, {
            headers: { "Authorization": `Bearer ${apiKey}` }
        })

        console.log(`Status: ${healthRes.status}`)
        const healthData = await healthRes.json()
        console.log("Resposta:", JSON.stringify(healthData, null, 2))

    } catch (e) {
        console.error("❌ Erro no health check:", e)
    }

    // Verificar jobs em andamento
    try {
        console.log("\n📋 Verificando jobs...")
        const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/status`, {
            headers: { "Authorization": `Bearer ${apiKey}` }
        })

        if (res.ok) {
            const data = await res.json()
            console.log("Jobs:", JSON.stringify(data, null, 2))
        } else {
            console.log(`Status code: ${res.status}`)
            const text = await res.text()
            console.log("Resposta:", text)
        }
    } catch (e) {
        console.error("❌ Erro ao verificar jobs:", e)
    }
}

checkRunpodEndpoint()
