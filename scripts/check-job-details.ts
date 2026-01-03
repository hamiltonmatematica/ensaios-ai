import 'dotenv/config'

async function checkJobDetails() {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
    const RUNPOD_UPSCALE_ENDPOINT_ID = "qqx0my03hxzi5k"
    const jobId = "4f09311d-edc6-40b5-a71a-65e855c7f450-u1"

    console.log("🔍 Verificando detalhes do job completado\n")

    const statusRes = await fetch(
        `https://api.runpod.ai/v2/${RUNPOD_UPSCALE_ENDPOINT_ID}/status/${jobId}`,
        {
            headers: {
                "Authorization": `Bearer ${RUNPOD_API_KEY}`,
            },
        }
    )

    const data = await statusRes.json()
    console.log("Response completa:")
    console.log(JSON.stringify(data, null, 2))
}

checkJobDetails()
