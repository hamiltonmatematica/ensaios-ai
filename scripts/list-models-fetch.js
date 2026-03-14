
require('dotenv').config();
const API_KEY = process.env.GEMINI_API_KEY || '';

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.models) {
            console.log("Modelos disponíveis:");
            data.models.forEach(m => {
                console.log(`- ${m.name}: ${m.description} (Methods: ${m.supportedGenerationMethods.join(", ")})`);
            });
        } else {
            console.log("Nenhum modelo encontrado ou erro na API:", data);
        }
    } catch (err) {
        console.error("Erro ao listar modelos:", err.message);
    }
}

listModels();
