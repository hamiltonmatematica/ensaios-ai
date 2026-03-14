require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || '';
console.log("[TEST] API Key present:", !!API_KEY, "- length:", API_KEY.length);

async function testGoogle() {
    console.log("\n=== TESTANDO GOOGLE GEMINI (nano-banana-pro-preview) ===");
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "models/nano-banana-pro-preview" });

    try {
        const result = await model.generateContent([
            "Generate a professional headshot photo of a young man in a business suit, studio lighting, 8k quality",
        ]);

        const response = await result.response;
        const candidates = response.candidates;

        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            console.log("[Google] Parts count:", parts.length);

            for (const part of parts) {
                if (part.inlineData) {
                    console.log("[Google] ✅ IMAGEM GERADA! mimeType:", part.inlineData.mimeType, "data length:", part.inlineData.data?.length);
                    return true;
                }
                if (part.text) {
                    console.log("[Google] Text response:", part.text.substring(0, 200));
                }
            }
        } else {
            console.log("[Google] ❌ Sem candidates na resposta");
        }

        const text = response.text();
        console.log("[Google] Text fallback:", text.substring(0, 200));
        return false;

    } catch (error) {
        console.error("[Google] ❌ ERRO:", error.message);
        if (error.message?.includes('429')) {
            console.error("[Google] Rate limit atingido (429)");
        }
        return false;
    }
}

async function testFal() {
    console.log("\n=== TESTANDO FAL.AI (Flux) ===");
    const FAL_KEY = process.env.FAL_KEY;
    console.log("[Fal] Key present:", !!FAL_KEY);

    if (!FAL_KEY) {
        console.error("[Fal] ❌ FAL_KEY não encontrada!");
        return false;
    }

    try {
        const axios = require('axios');
        const response = await axios.post(
            "https://queue.fal.run/fal-ai/flux/schnell",
            {
                prompt: "Professional headshot photo of a young man in business suit, studio lighting, high quality",
                image_size: "portrait_4_3",
                num_images: 1,
                enable_safety_checker: true,
                sync_mode: true
            },
            {
                headers: {
                    'Authorization': `Key ${FAL_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60000
            }
        );

        console.log("[Fal] Status:", response.status);
        console.log("[Fal] Response keys:", Object.keys(response.data));

        if (response.data.images && response.data.images.length > 0) {
            console.log("[Fal] ✅ IMAGEM GERADA! URL:", response.data.images[0].url);
            return true;
        }

        // Check if it's a queued response
        if (response.data.status_url || response.data.request_id) {
            console.log("[Fal] ⏳ Job na fila:", JSON.stringify(response.data));

            // Poll for result
            const statusUrl = response.data.status_url;
            const responseUrl = response.data.response_url;

            if (responseUrl) {
                console.log("[Fal] Polling response_url...");
                for (let i = 0; i < 30; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    try {
                        const pollRes = await axios.get(responseUrl, {
                            headers: { 'Authorization': `Key ${FAL_KEY}` }
                        });
                        if (pollRes.data.images) {
                            console.log("[Fal] ✅ IMAGEM GERADA via polling! URL:", pollRes.data.images[0].url);
                            return true;
                        }
                        console.log(`[Fal] Poll ${i + 1}: status=${pollRes.status}`);
                    } catch (pollErr) {
                        if (pollErr.response?.status === 202) {
                            console.log(`[Fal] Poll ${i + 1}: still processing...`);
                        } else {
                            console.log(`[Fal] Poll ${i + 1}: error=${pollErr.message}`);
                        }
                    }
                }
            }
            return false;
        }

        console.log("[Fal] ❌ Resposta inesperada:", JSON.stringify(response.data).substring(0, 200));
        return false;

    } catch (error) {
        console.error("[Fal] ❌ ERRO:", error.message);
        if (error.response) {
            console.error("[Fal] Status:", error.response.status);
            console.error("[Fal] Data:", JSON.stringify(error.response.data).substring(0, 300));
        }
        return false;
    }
}

async function main() {
    const googleOk = await testGoogle();
    const falOk = await testFal();

    console.log("\n=== RESULTADO FINAL ===");
    console.log("Google Gemini:", googleOk ? "✅ OK" : "❌ FALHOU");
    console.log("Fal.ai:", falOk ? "✅ OK" : "❌ FALHOU");

    if (!googleOk && !falOk) {
        console.error("\n⚠️  AMBOS os provedores falharam! A geração não vai funcionar.");
    }
}

main();
