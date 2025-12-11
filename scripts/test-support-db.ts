
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
    console.log("Testing Support API logic directly...")

    // Simulate DB connection
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error("DATABASE_URL not found")

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
        // Create a test message directly in DB to verify schema/connection
        const message = await prisma.supportMessage.create({
            data: {
                name: "Test User",
                email: "test@example.com",
                whatsapp: "11999999999",
                message: "Test message from verification script",
                status: "PENDING"
            }
        })
        console.log("✅ DB Write Successful:", message)

        // Clean up
        await prisma.supportMessage.delete({ where: { id: message.id } })
        console.log("✅ Clean up Successful")

    } catch (e) {
        console.error("❌ DB Write Failed:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
