import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { CreditService } from "@/lib/credit-service"
import { FEATURE_COSTS } from "@/lib/credit-constants"
import { NextRequest, NextResponse } from "next/server"

// This endpoint is mostly for internal use or debugging, 
// as features usually consume credits directly within their own API routes.
// However, it can be used for client-side consumption checks if needed.

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { feature, amount } = body

    if (!feature || !amount) {
        return NextResponse.json({ error: "Missing feature or amount" }, { status: 400 })
    }

    try {
        await CreditService.consumeCredits(session.user.id, amount, feature)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }
}
