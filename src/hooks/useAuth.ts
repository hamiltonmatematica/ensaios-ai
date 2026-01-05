// Hook customizado para autenticação Supabase em client components
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"

interface User {
    id: string
    email: string
    name?: string
    credits?: number
}

interface UseAuthReturn {
    user: User | null
    loading: boolean
    credits: number
    refreshCredits: () => Promise<void>
}

export function useAuth(redirectTo?: string): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null)
    const [credits, setCredits] = useState(0)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    const fetchCredits = async () => {
        try {
            const res = await fetch('/api/credits/check-balance')
            const data = await res.json()
            setCredits(data.totalCredits || 0)
        } catch (error) {
            console.error('Error fetching credits:', error)
        }
    }

    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/user')
            const data = await res.json()
            if (data.user) {
                setUser({
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    credits: data.user.credits
                })
                // Não setar credits aqui para não sobrescrever o valor atualizado do check-balance
                // setCredits(data.user.credits || 0)
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
        }
    }

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user }, error }) => {
            if (error || !user) {
                if (redirectTo) {
                    router.push(redirectTo)
                }
                setLoading(false)
                return
            }

            // Buscar dados completos do usuário
            await Promise.all([fetchUserData(), fetchCredits()])
            setLoading(false)
        })
    }, [])

    const refreshCredits = async () => {
        await fetchCredits()
    }

    return { user, loading, credits, refreshCredits }
}
