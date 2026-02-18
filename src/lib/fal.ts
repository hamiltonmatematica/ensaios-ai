import axios from "axios";

/**
 * Chama a API do Fal.ai usando o modelo especificado.
 * Usa as URLs status_url e response_url retornadas pelo fal.ai para polling.
 */
export async function callFalAi(model: string, input: any) {
    const FAL_KEY = process.env.FAL_KEY;

    if (!FAL_KEY) {
        throw new Error("FAL_KEY não configurada no ambiente.");
    }

    try {
        console.log(`[Fal.ai] Chamando modelo: ${model}`);

        let response;
        try {
            response = await axios.post(
                `https://queue.fal.run/${model}`,
                input,
                {
                    headers: {
                        'Authorization': `Key ${FAL_KEY}`,
                        'Content-Type': 'application/json',
                    }
                }
            );
        } catch (axiosError: any) {
            console.error("[Fal.ai] Erro Axios POST:", axiosError.response?.status, axiosError.response?.data);
            throw new Error(`[Fal.ai POST] ${axiosError.message}`);
        }

        const { request_id, status_url, response_url } = response.data;

        if (!request_id) {
            return response.data; // Resposta direta se não houver fila
        }

        // Usa as URLs retornadas pelo fal.ai (corretas para cada modelo)
        return await pollFalAiResult(status_url, response_url, FAL_KEY);

    } catch (error: any) {
        console.error("[Fal.ai] Erro na chamada:", error.response?.data || error.message);
        throw error;
    }
}

async function pollFalAiResult(statusUrl: string, responseUrl: string, FAL_KEY: string): Promise<any> {
    const maxRetries = 300;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const statusRes = await axios.get(statusUrl, {
                headers: { 'Authorization': `Key ${FAL_KEY}` }
            });

            const statusData = statusRes.data;

            if (statusData.status === 'COMPLETED') {
                console.log(`[Fal.ai] Concluído. Buscando resultado...`);
                const finalRes = await axios.get(responseUrl, {
                    headers: { 'Authorization': `Key ${FAL_KEY}` }
                });
                return finalRes.data;
            }

            if (statusData.status === 'ERROR') {
                throw new Error(statusData.error || "Falha no processamento Fal.ai");
            }

            console.log(`[Fal.ai] Processando (${i + 1}s)... status: ${statusData.status}`);
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e: any) {
            console.error("[Fal.ai] Erro no polling:", e.message);
            throw e;
        }
    }

    throw new Error("Timeout aguardando processamento do Fal.ai");
}
