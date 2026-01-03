// Teste final do endpoint de upscale
const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

async function testUpscaleFinal() {
    console.log("🧪 Testando endpoint /api/upscale-image...")
    console.log("⚠️  Nota: Este teste vai falhar com 401 (não autenticado), mas se mostrar 'Configuração de API incompleta', há um problema.\n")

    try {
        const res = await fetch("http://localhost:3000/api/upscale-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                image: testImage,
                scale: "2x"
            })
        })

        console.log(`Status: ${res.status}`)
        const data = await res.json()
        console.log("Resposta:", JSON.stringify(data, null, 2))

        if (data.error === "Configuração de API incompleta.") {
            console.log("\n❌ PROBLEMA: Ainda há erro de configuração!")
            console.log("Details:", data.details)
        } else if (data.error === "Você precisa estar logado.") {
            console.log("\n✅ SUCESSO: Backend está funcionando! O erro é apenas de autenticação (esperado).")
        }

    } catch (e) {
        console.error("Erro:", e)
    }
}

testUpscaleFinal()
