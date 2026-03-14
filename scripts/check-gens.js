
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function checkGenerations() {
    try {
        const gens = await prisma.generation.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { model: true }
        })
        console.log("Últimas 5 gerações:")
        gens.forEach(g => {
            console.log(`ID: ${g.id} | Status: ${g.status} | Model: ${g.model.name} | CreatedAt: ${g.createdAt}`)
        })
    } catch (err) {
        console.error("Erro:", err)
    } finally {
        await prisma.$disconnect()
    }
}

checkGenerations()
