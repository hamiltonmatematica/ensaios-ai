import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { FEATURE_COSTS } from "@/lib/credit-constants"
import { NextRequest, NextResponse } from "next/server"

// This endpoint is mostly for internal use or debugging, 
// as features usually consume credits directly within their own API routes.
// However, it can be used for client-side consumption checks if needed.

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Busca usuário no Prisma
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true }
    })

    if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { feature, amount } = body

    if (!feature || !amount) {
        return NextResponse.json({ error: "Missing feature or amount" }, { status: 400 })
    }

    try {
        await CreditService.consumeCredits(dbUser.id, amount, feature)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }
}
