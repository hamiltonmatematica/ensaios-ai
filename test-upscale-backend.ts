// Teste direto do endpoint de upscale (bypassa navegador)
const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

async function testUpscale() {
    console.log("🧪 Testando /api/upscale-image (backend direto)...\n")

    try {
        const res = await fetch("http://localhost:3000/api/upscale-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image: testImage,
                scale: "2x"
            })
        })

        console.log(`Status: ${res.status}`)
        const data = await res.json()
        console.log("Resposta:", JSON.stringify(data, null, 2))

        // Análise
        if (res.status === 401) {
            console.log("\n✅ BACKEND OK - Erro é apenas falta de autenticação (esperado)")
        } else if (data.error?.includes("Configuração")) {
            console.log("\n❌ PROBLEMA REAL - Backend tem erro de configuração")
            console.log("Details:", data.details || data)
        } else {
            console.log("\n⚠️  Resposta inesperada")
        }

    } catch (e) {
        console.error("❌ Erro na requisição:", e)
    }
}

testUpscale()
