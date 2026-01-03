/**
 * Centralized RunPod Error Handler
 * Provides consistent error handling and user-friendly messages for RunPod API interactions
 */

export interface RunPodErrorResult {
    message: string
    shouldRetry: boolean
    statusCode: number
    details?: string
}

export interface RunPodEndpointConfig {
    apiKey: string
    endpointId: string
    name: string
}

/**
 * Maps RunPod status codes to user-friendly messages
 */
export function handleRunPodError(
    status: number,
    responseBody: string,
    context: string
): RunPodErrorResult {
    let message = "Erro ao processar solicitação"
    let shouldRetry = false

    switch (status) {
        case 503:
            message = "Servidor temporariamente indisponível. O endpoint pode estar inicializando. Aguarde 1-2 minutos e tente novamente."
            shouldRetry = true
            break

        case 401:
        case 403:
            message = "Erro de autenticação com o servidor de processamento. Entre em contato com o suporte."
            shouldRetry = false
            break

        case 400:
            message = "Dados enviados são inválidos. Verifique as imagens e tente novamente."
            shouldRetry = false
            break

        case 413:
            message = "Imagem muito grande. Tente com uma imagem menor (máximo 10MB)."
            shouldRetry = false
            break

        case 429:
            message = "Muitas requisições. Aguarde alguns segundos e tente novamente."
            shouldRetry = true
            break

        case 500:
        case 502:
        case 504:
            message = "Erro no servidor de processamento. Tente novamente em alguns minutos."
            shouldRetry = true
            break

        default:
            message = `Erro ao processar (código ${status}). Tente novamente.`
            shouldRetry = false
    }

    // Detectar erros específicos no corpo da resposta
    const bodyLower = responseBody.toLowerCase()
    if (bodyLower.includes("max body size") || bodyLower.includes("payload too large")) {
        message = "Imagem muito grande. Tente com uma imagem menor."
        shouldRetry = false
    }

    return {
        message,
        shouldRetry,
        statusCode: status,
        details: responseBody.substring(0, 200) // Primeiros 200 chars para debug
    }
}

/**
 * Validates RunPod endpoint configuration
 */
export function validateEndpointConfig(
    config: Partial<RunPodEndpointConfig>
): { valid: boolean; error?: string } {
    if (!config.apiKey) {
        return {
            valid: false,
            error: "RUNPOD_API_KEY não configurada"
        }
    }

    if (!config.endpointId) {
        return {
            valid: false,
            error: `Endpoint ID não configurado para ${config.name || 'serviço'}`
        }
    }

    // Validar formato do endpoint ID (geralmente 14 caracteres alfanuméricos)
    if (config.endpointId.length < 10) {
        return {
            valid: false,
            error: `Endpoint ID inválido para ${config.name || 'serviço'}`
        }
    }

    return { valid: true }
}

/**
 * Structured logging for RunPod operations
 */
export function logRunPodOperation(
    operation: string,
    data: {
        endpoint?: string
        status?: number
        jobId?: string
        error?: string
        duration?: number
    }
) {
    const timestamp = new Date().toISOString()
    const logData = {
        timestamp,
        operation,
        ...data
    }

    if (data.error) {
        console.error(`[RunPod ${operation}]`, logData)
    } else {
        console.log(`[RunPod ${operation}]`, logData)
    }

    return logData
}

/**
 * Detecta se o erro é um cold start e sugere retry
 */
export function isColdStartError(status: number, responseBody: string): boolean {
    if (status === 503) return true

    const bodyLower = responseBody.toLowerCase()
    return bodyLower.includes("cold start") ||
        bodyLower.includes("initializing") ||
        bodyLower.includes("starting up")
}

/**
 * Parse resultado do RunPod com múltiplos formatos possíveis
 */
export function parseRunPodOutput(output: any): string | null {
    if (!output) return null

    // Formato 1: output.output
    if (output.output) {
        if (typeof output.output === 'string') {
            return output.output
        }
        // Formato 2: output.output.image_url
        if (output.output.image_url) {
            return output.output.image_url
        }
        // Formato 3: output.output.image
        if (output.output.image) {
            return output.output.image
        }
    }

    // Formato 4: output direto
    if (typeof output === 'string') {
        return output
    }

    // Formato 5: output.image_url
    if (output.image_url) {
        return output.image_url
    }

    // Formato 6: output.image
    if (output.image) {
        return output.image
    }

    return null
}

/**
 * Adiciona prefixo base64 se necessário
 */
export function ensureBase64Prefix(imageData: string): string {
    if (!imageData) return imageData

    if (imageData.startsWith('data:image')) {
        return imageData
    }

    // Assume PNG se não especificado
    return `data:image/png;base64,${imageData}`
}
