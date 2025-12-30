/**
 * Centralized RunPod API client
 * Handles all communication with RunPod Serverless endpoints
 */

const RUNPOD_API_URL = "https://api.runpod.ai/v2"

export interface RunpodResponse {
    id: string
    status?: string
}

export interface RunpodStatusResponse {
    id: string
    status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT"
    output?: unknown
    error?: string
}

/**
 * Call a RunPod serverless endpoint
 * @param endpointId - The RunPod endpoint ID
 * @param input - The input payload for the endpoint
 * @returns The job ID from RunPod
 */
export async function callRunpod(
    endpointId: string,
    input: Record<string, unknown>
): Promise<RunpodResponse> {
    const apiKey = process.env.RUNPOD_API_KEY

    if (!apiKey) {
        throw new Error("RUNPOD_API_KEY not configured")
    }

    if (!endpointId) {
        throw new Error("RunPod endpoint ID not provided")
    }

    const url = `${RUNPOD_API_URL}/${endpointId}/run`

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ input }),
        })

        if (!res.ok) {
            const text = await res.text()
            console.error(`RunPod API error (${res.status}):`, text)
            throw new Error("RUNPOD_REQUEST_FAILED")
        }

        const data = await res.json()

        // RunPod can return different field names for the job ID
        const jobId = data.id ?? data.requestId ?? data.jobId

        if (!jobId) {
            console.error("RunPod response missing job ID:", data)
            throw new Error("RUNPOD_INVALID_RESPONSE")
        }

        return { id: jobId, status: data.status }
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("RUNPOD_")) {
            throw error
        }
        console.error("RunPod request failed:", error)
        throw new Error("RUNPOD_REQUEST_FAILED")
    }
}

/**
 * Get the status of a RunPod job
 * @param endpointId - The RunPod endpoint ID
 * @param jobId - The job ID to check
 * @returns The job status and output
 */
export async function getRunpodStatus(
    endpointId: string,
    jobId: string
): Promise<RunpodStatusResponse> {
    const apiKey = process.env.RUNPOD_API_KEY

    if (!apiKey) {
        throw new Error("RUNPOD_API_KEY not configured")
    }

    const url = `${RUNPOD_API_URL}/${endpointId}/status/${jobId}`

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
        })

        if (!res.ok) {
            const text = await res.text()
            console.error(`RunPod status check error (${res.status}):`, text)
            throw new Error("RUNPOD_STATUS_CHECK_FAILED")
        }

        const data = await res.json()
        return data as RunpodStatusResponse
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("RUNPOD_")) {
            throw error
        }
        console.error("RunPod status check failed:", error)
        throw new Error("RUNPOD_STATUS_CHECK_FAILED")
    }
}
