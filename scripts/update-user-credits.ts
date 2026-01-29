import { PrismaClient } from "@prisma/client"
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
    const prisma = new PrismaClient()

    console.log("🔄 Atualizando créditos de usuários NÃO-ADMIN para 100...")

    try {
        // Encontrar e atualizar usuários onde role != 'ADMIN'
        // Atualiza tanto o campo legado 'credits' quanto o novo 'CreditBalance'

        // 1. Atualizar campo 'credits' legado
        const updateUsers = await prisma.user.updateMany({
            where: {
                role: {
                    not: "ADMIN"
                }
            },
            data: {
                credits: 100
            }
        })

        console.log(`✅ ${updateUsers.count} usuários atualizados (campo legado 'credits').`)

        // 2. Atualizar 'CreditBalance' (novo sistema)
        // Precisamos buscar os IDs dos usuários não-admins para atualizar seus balances
        const users = await prisma.user.findMany({
            where: { role: { not: "ADMIN" } },
            select: { id: true, email: true }
        })

        let balanceUpdates = 0
        for (const user of users) {
            await prisma.creditBalance.upsert({
                where: { userId: user.id },
                update: { totalCredits: 100 },
                create: {
                    userId: user.id,
                    totalCredits: 100
                }
            })
            balanceUpdates++
        }

        console.log(`✅ ${balanceUpdates} saldos de crédito atualizados.`)
        console.log("🎉 Processo concluído com sucesso!")

    } catch (error) {
        console.error("❌ Erro ao atualizar usuários:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
