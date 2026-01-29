import { PrismaClient } from "@prisma/client"
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
    const prisma = new PrismaClient()

    console.log("🔄 Resetting USER credits to 40 (preserving ADMINs)...")

    try {
        // 1. Atualizar usuários com role != 'ADMIN'
        const users = await prisma.user.findMany({
            where: { role: { not: "ADMIN" } },
            select: { id: true, email: true }
        })

        console.log(`📋 Found ${users.length} non-admin users to update.`)

        let updated = 0
        for (const user of users) {
            // Atualiza créditos legados
            await prisma.user.update({
                where: { id: user.id },
                data: { credits: 40 }
            })

            // Atualiza CreditBalance
            await prisma.creditBalance.upsert({
                where: { userId: user.id },
                update: { totalCredits: 40 },
                create: {
                    userId: user.id,
                    totalCredits: 40
                }
            })
            updated++
        }

        console.log(`✅ Successfully reset ${updated} users to 40 credits.`)

    } catch (error) {
        console.error("❌ Error updating credits:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
