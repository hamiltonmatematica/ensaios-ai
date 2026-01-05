import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { CreditService } from "@/lib/credit-service"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
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

    // Check for migration (legacy credits -> new system)
    await CreditService.checkMigration(dbUser.id)

    const balance = await CreditService.getBalance(dbUser.id)

    return NextResponse.json({
        totalCredits: balance.totalCredits,
    })
}
