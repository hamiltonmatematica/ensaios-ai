import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const history = await prisma.creditTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit 50 recent transactions
    })

    return NextResponse.json({
        transactions: history
    })
}
