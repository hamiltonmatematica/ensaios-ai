
import dotenv from 'dotenv'
import path from 'path'

// Carrega variáveis de ambiente do arquivo .env na raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Verifying user credits...")
    const users = await prisma.user.findMany()

    for (const user of users) {
        if (user.credits < 3) {
            console.log(`Updating user ${user.email} from ${user.credits} to 3 credits.`)
            await prisma.user.update({
                where: { id: user.id },
                data: { credits: 3 }
            })
        } else {
            console.log(`User ${user.email} already has ${user.credits} credits.`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
