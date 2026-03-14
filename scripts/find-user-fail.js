
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function findUser() {
    try {
        const gen = await prisma.generation.findFirst({
            where: { status: 'FAILED' },
            orderBy: { createdAt: 'desc' },
            include: { user: { include: { creditBalance: true } } }
        })
        if (gen) {
            console.log(`User: ${gen.user.email} | Credits: ${gen.user.creditBalance?.totalCredits}`)
        }
    } catch (err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}

findUser()
