
import { PrismaClient } from "@prisma/client"
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL not found")
    }

    const prisma = new PrismaClient()

    try {
        const users = await prisma.user.findMany()
        console.log("Users:", JSON.stringify(users, null, 2))
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
