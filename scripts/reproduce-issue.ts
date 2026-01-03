
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { config } from "dotenv"
import { CreditService } from "../src/lib/credit-service"

config()

const userId = "cmj0vgk4a0000jq4ezshg9g5k" // hamilton.vinicius@gmail.com

async function test() {
    console.log(`Testing credit consumption for ${userId}`)

    try {
        console.log("1. Checking Balance...")
        const balance = await CreditService.getBalance(userId)
        console.log("Balance:", balance)

        console.log("2. Attempting to consume 5 credits...")
        await CreditService.consumeCredits(userId, 5, "TEST_CONSUMPTION")
        console.log("SUCCESS: Consumed 5 credits.")

        console.log("3. Checking Balance again...")
        const newBalance = await CreditService.getBalance(userId)
        console.log("New Balance:", newBalance)

    } catch (e) {
        console.error("FAILURE:", e)
    }
}

test()
