import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { CreditService } from "@/lib/credit-service"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for migration (legacy credits -> new system)
    await CreditService.checkMigration(session.user.id)

    const balance = await CreditService.getBalance(session.user.id)

    return NextResponse.json({
        totalCredits: balance.totalCredits,
    })
}
