import 'dotenv/config'

async function checkRunPod() {
    const apiKey = process.env.RUNPOD_API_KEY
    console.log("--- Verificando Configuração RunPod ---")
    console.log(`API Key presente: ${!!apiKey}`)
    if (apiKey) console.log(`API Key prefixo: ${apiKey.substring(0, 8)}...`)

    if (!apiKey) {
        console.error("ERRO: RUNPOD_API_KEY não encontrada no .env")
        return
    }

    // Lista de endpoints para testar
    const endpoints = [
        { name: "Upscaler", id: process.env.RUNPOD_UPSCALER_ID },
        { name: "Inpaint (ComfyUI)", id: process.env.RUNPOD_COMFYUI_ID },
        { name: "Virtual Try-On", id: process.env.RUNPOD_VIRTUAL_TRY_ON_ID },
        { name: "Image Gen (FLUX)", id: process.env.RUNPOD_FLUX_ENDPOINT_ID },
    ]

    for (const endpoint of endpoints) {
        console.log(`\nTestando ${endpoint.name} (${endpoint.id})...`)

        if (!endpoint.id) {
            console.log("⚠️  ID não configurado")
            continue
        }

        try {
            // Tentar health check ou status
            const url = `https://api.runpod.ai/v2/${endpoint.id}/health`
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            })

            console.log(`Status HTTP: ${res.status} ${res.statusText}`)

            if (!res.ok) {
                const text = await res.text()
                console.log(`❌ Falha: ${text}`)
            } else {
                const data = await res.json()
                console.log(`✅ Sucesso: Workers disponíveis: ${data.workers?.idle || 0}`)
            }
        } catch (error) {
            console.error(`❌ Erro de conexão:`, error)
        }
    }
}

checkRunPod()
