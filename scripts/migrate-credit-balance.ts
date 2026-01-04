import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Criar pool e adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function migrateCreditBalances() {
    console.log('🔄 Iniciando migração de CreditBalance...\n')

    try {
        // Buscar todos os usuários que NÃO têm CreditBalance
        const usersWithoutBalance = await prisma.user.findMany({
            where: {
                creditBalance: null
            },
            select: {
                id: true,
                email: true,
                credits: true
            }
        })

        console.log(`📊 Encontrados ${usersWithoutBalance.length} usuários sem CreditBalance\n`)

        if (usersWithoutBalance.length === 0) {
            console.log('✅ Todos os usuários já possuem CreditBalance!')
            return
        }

        // Migrar cada usuário
        let successCount = 0
        let errorCount = 0

        for (const user of usersWithoutBalance) {
            try {
                await prisma.creditBalance.create({
                    data: {
                        userId: user.id,
                        totalCredits: user.credits
                    }
                })

                console.log(`✅ Migrado: ${user.email} (${user.credits} créditos)`)
                successCount++
            } catch (error) {
                console.error(`❌ Erro ao migrar ${user.email}:`, error)
                errorCount++
            }
        }

        console.log('\n' + '='.repeat(50))
        console.log(`✅ Sucesso: ${successCount}`)
        console.log(`❌ Erros: ${errorCount}`)
        console.log('='.repeat(50))

    } catch (error) {
        console.error('❌ Erro fatal:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar migração
migrateCreditBalances()
    .then(() => {
        console.log('\n✅ Migração concluída com sucesso!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Falha na migração:', error)
        process.exit(1)
    })
