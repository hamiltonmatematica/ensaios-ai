// Este script simula uma chamada autenticada ao endpoint de upscale
// para capturar o erro exato que está acontecendo

const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP6DwABBAEAAAAA1wAAAABJRU5ErkJggg=="

async function testUpscale() {
    console.log("Testando /api/upscale-image...")

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
        console.log("Resposta completa:", JSON.stringify(data, null, 2))

    } catch (e) {
        console.error("Erro:", e)
    }
}

testUpscale()
