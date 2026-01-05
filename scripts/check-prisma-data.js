const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkData() {
    try {
        console.log('🔍 Verificando dados no Prisma...\n')

        // Contar usuários
        const userCount = await prisma.user.count()
        console.log(`📊 Total de usuários: ${userCount}`)

        if (userCount > 0) {
            // Listar primeiros 10 usuários
            const users = await prisma.user.findMany({
                take: 10,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    credits: true,
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })

            console.log('\n👥 Usuários encontrados:')
            users.forEach((user, idx) => {
                console.log(`\n${idx + 1}. ${user.email}`)
                console.log(`   Nome: ${user.name || 'N/A'}`)
                console.log(`   Role: ${user.role}`)
                console.log(`   Créditos: ${user.credits}`)
                console.log(`   Criado em: ${user.createdAt.toLocaleDateString('pt-BR')}`)
            })

            // Verificar admin
            const adminCount = await prisma.user.count({
                where: { role: 'ADMIN' }
            })
            console.log(`\n👑 Total de admins: ${adminCount}`)
        }

        // Verificar outros dados
        const generationCount = await prisma.generation.count()
        const faceSwapCount = await prisma.faceSwapJob.count()
        const upscaleCount = await prisma.imageUpscale.count()

        console.log(`\n📸 Total de gerações (Ensaio): ${generationCount}`)
        console.log(`🔄 Total de Face Swaps: ${faceSwapCount}`)
        console.log(`⬆️  Total de Upscales: ${upscaleCount}`)

    } catch (error) {
        console.error('❌ Erro:', error.message)
    } finally {
        await prisma.$disconnect()
    }
}

checkData()
