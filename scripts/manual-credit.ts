
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2]
    const credits = parseInt(process.argv[3]) || 10

    if (!email) {
        console.error('Por favor, fornça um email: npx tsx scripts/manual-credit.ts user@example.com 10')
        process.exit(1)
    }

    const user = await prisma.user.findUnique({
        where: { email },
    })

    if (!user) {
        console.error(`Usuário não encontrado: ${email}`)
        process.exit(1)
    }

    const updatedUser = await prisma.user.update({
        where: { email },
        data: {
            credits: { increment: credits },
        },
    })

    // Registra uma transação manual para histórico
    await prisma.transaction.create({
        data: {
            userId: user.id,
            stripeId: `manual_${Date.now()}`,
            packageId: 'manual_grant',
            amount: 0,
            credits: credits,
            status: 'completed',
        },
    })

    console.log(`✅ Sucesso! Adicionados ${credits} créditos para ${email}. Total atual: ${updatedUser.credits}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
