// Helper comum para autenticação Supabase em API routes
// Use em todos os endpoints: const { supabaseUser, dbUser } = await authenticateRequest()

import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function authenticateRequest() {
    const supabase = await createClient()
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !supabaseUser?.email) {
        throw new Error("NOT_AUTHENTICATED")
    }

    // Busca usuário no Prisma por email
    const dbUser = await prisma.user.findUnique({
        where: { email: supabaseUser.email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            credits: true
        }
    })

    if (!dbUser) {
        throw new Error("USER_NOT_FOUND")
    }

    return { supabaseUser, dbUser }
}

export async function authenticateAdmin() {
    const { supabaseUser, dbUser } = await authenticateRequest()

    if (dbUser.role !== "ADMIN") {
        throw new Error("NOT_ADMIN")
    }

    return { supabaseUser, dbUser }
}

export function handleAuthError(error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"

    switch (message) {
        case "NOT_AUTHENTICATED":
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
        case "USER_NOT_FOUND":
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        case "NOT_ADMIN":
            return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 })
        default:
            return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
