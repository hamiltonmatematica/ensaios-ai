// import dotenv from 'dotenv'
// import path from 'path'
// // import { GoogleGenAI } from "@google/genai" 

// dotenv.config({ path: path.resolve(__dirname, '../.env') })

// const API_KEY = process.env.GEMINI_API_KEY || ''

// async function listModels() {
//     console.log("Script disabled for build stability.")
/*
if (!API_KEY) {
    console.error("API Key missing")
    return
}
const ai = new GoogleGenAI({ apiKey: API_KEY })
try {
    console.log("Listing 'gemini' models...")
    const response = await ai.models.list()
    // @ts-ignore
    const models = response.models || response || []

    models.forEach((m: any) => {
        if (m.name && m.name.toLowerCase().includes('gemini')) {
            console.log(m.name)
        }
    })
} catch (error) {
    console.error("Error listing models:", error)
}
*/
// }

// listModels()
