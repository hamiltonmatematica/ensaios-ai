const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function addCredits() {
    console.log('💰 Adicionando créditos...\n')

    // Busca usuário pelo email
    const user = await prisma.user.findFirst({
        where: {
            email: 'hamilton.vinicius@gmail.com' // ← SEU EMAIL
        },
        include: {
            creditBalance: true
        }
    })

    if (!user) {
        console.log('❌ Usuário não encontrado!')
        return
    }

    console.log(`✅ Usuário encontrado: ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Créditos atuais: ${user.creditBalance?.totalCredits || 0}\n`)

    // Atualiza ou cria creditBalance
    if (user.creditBalance) {
        // Já tem balance, atualiza
        await prisma.creditBalance.update({
            where: { userId: user.id },
            data: {
                totalCredits: 10000
            }
        })
        console.log('✅ Créditos atualizados para 10.000!')
    } else {
        // Não tem balance, cria
        await prisma.creditBalance.create({
            data: {
                userId: user.id,
                totalCredits: 10000
            }
        })
        console.log('✅ CreditBalance criado com 10.000 créditos!')
    }

    // Atualiza role para ADMIN
    await prisma.user.update({
        where: { id: user.id },
        data: {
            role: 'ADMIN'
        }
    })

    console.log('✅ Role atualizada para ADMIN!')
    console.log('\n🎉 PRONTO! Agora:')
    console.log('   1. Recarregue qualquer página')
    console.log('   2. Teste as ferramentas (ensaio, face swap, upscale)')
    console.log('   3. Veja /admin/users - você deve aparecer')
}

addCredits()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
