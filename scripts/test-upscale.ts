import 'dotenv/config'

async function testUpscaleEndpoint() {
    // Imagem 1x1 pixel em base64
    const dummyImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP6DwABBAEAAAAA1wAAAABJRU5ErkJggg=="

    console.log("Testando endpoint /api/upscale-image...")

    try {
        const res = await fetch("http://localhost:3000/api/upscale-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": "next-auth.session-token=test" // Simular autenticação
            },
            body: JSON.stringify({
                image: dummyImage,
                scale: "2x"
            })
        })

        console.log(`Status: ${res.status}`)
        const text = await res.text()
        console.log(`Resposta: ${text}`)

    } catch (e) {
        console.error("Erro:", e)
    }
}

testUpscaleEndpoint()
