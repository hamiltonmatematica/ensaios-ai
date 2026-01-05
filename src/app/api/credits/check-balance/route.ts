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
    try {
        console.log(`[CheckBalance] Checking for user email: ${user.email}`)

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true }
        })

        if (!dbUser) {
            console.log(`[CheckBalance] User not found in Prisma for email: ${user.email}`)
            return NextResponse.json({ error: "User not found in database" }, { status: 404 })
        }

        // Check for migration (legacy credits -> new system)
        await CreditService.checkMigration(dbUser.id)

        const balance = await CreditService.getBalance(dbUser.id)

        return NextResponse.json({
            totalCredits: balance.totalCredits,
        })
    } catch (error: any) {
        console.error("[CheckBalance] Critical Error:", error)
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message,
            code: error.code,
            meta: error.meta
        }, { status: 500 })
    }
}
