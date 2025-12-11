
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL not found")
    }

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    const email = "hamilton.vinicius@gmail.com"

    try {
        const updated = await prisma.user.update({
            where: { email },
            data: { role: "ADMIN" }
        })
        console.log("User promoted to ADMIN:", updated)
    } catch (e) {
        console.error("Error promoting user:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
