
import { PrismaClient } from '@prisma/client'
import { config } from "dotenv"
config()

const email = process.argv[2] || "hamilton.vinicius@gmail.com"

async function checkUser() {
    console.log("Checking for email:", email)
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing from env")
        return
    }

    const connectionString = process.env.DATABASE_URL
    const prisma = new PrismaClient()

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                creditBalance: true,
                creditTransactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                subscription: true
            }
        })

        if (!user) {
            console.log("User not found")
            return
        }

        console.log("--- User Data ---")
        console.log(`ID: ${user.id}`)
        console.log(`Email: ${user.email}`)
        console.log(`Old Credits Field: ${user.credits}`)
        console.log("-----------------")
        console.log("--- Subscription ---")
        console.log(user.subscription)
        console.log("-----------------")
        console.log("--- New Credit System ---")
        if (user.creditBalance) {
            console.log(`CreditBalance Record Found:`)
            console.log(`Total Credits: ${user.creditBalance.totalCredits}`)
        } else {
            console.log("No CreditBalance record found.")
        }
        console.log("-----------------")
        console.log("--- Recent Transactions ---")
        console.log(user.creditTransactions)

    } catch (e) {
        console.error("Error querying database:", e)
    } finally {
        await prisma.$disconnect()
    }
}

checkUser()
