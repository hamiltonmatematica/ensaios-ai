import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLatestGenerations() {
    const latest = await prisma.generation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
            id: true,
            status: true,
            resultUrl: true,
            status: true,
            resultUrl: true,
            createdAt: true,
        }
    })

    console.log('\n=== ÚLTIMAS GERAÇÕES ===\n')
    latest.forEach((gen, index) => {
        console.log(`#${index + 1}:`)
        console.log(`  ID: ${gen.id}`)
        console.log(`  Status: ${gen.status}`)
        console.log(`  ResultURL: ${gen.resultUrl || '(NULL)'}`)
        console.log(`  Created: ${gen.createdAt}`)
        console.log('')
    })

    await prisma.$disconnect()
}

checkLatestGenerations().catch(console.error)
