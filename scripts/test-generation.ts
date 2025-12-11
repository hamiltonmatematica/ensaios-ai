
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { generatePhotoshootImage } from '../src/lib/nanoBanana'

async function test() {
    console.log("Iniciando teste de geração...")

    // Pequena imagem base64 de teste (pixel vermelho)
    const mockImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

    try {
        console.log("Chamando generatePhotoshootImage...")
        // Usando modelo e prompt de teste
        const result = await generatePhotoshootImage({
            referenceImages: [mockImage, mockImage, mockImage],
            promptTemplate: "A professional linkedin profile photo, suit and tie, studio lighting, grey background",
            aspectRatio: "1:1"
        })

        console.log("Sucesso! URL/Base64 gerada (primeiros 50 chars):", result.substring(0, 50))
    } catch (error) {
        console.error("ERRO NO TESTE:", error)
        if (error instanceof Error) {
            console.error("Message:", error.message)
            console.error("Stack:", error.stack)
        }
    }
}

test()
