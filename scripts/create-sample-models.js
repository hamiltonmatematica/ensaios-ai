const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function createSampleModels() {
    console.log('🎨 Criando modelos de exemplo...\n')

    const models = [
        {
            name: 'Profissional',
            description: 'Ensaio corporativo elegante',
            thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            promptTemplate: 'professional headshot, business attire, corporate background, studio lighting',
            creditsRequired: 2,
            isPremium: false,
            isActive: true,
            displayOrder: 1
        },
        {
            name: 'Casual',
            description: 'Foto casual e descontraído',
            thumbnailUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
            promptTemplate: 'casual portrait, natural smile, relaxed pose, outdoor lighting',
            creditsRequired: 2,
            isPremium: false,
            isActive: true,
            displayOrder: 2
        },
        {
            name: 'Instagram',
            description: 'Estilo Instagram vibrante',
            thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
            promptTemplate: 'instagram style, vibrant colors, trendy aesthetic, influencer vibe',
            creditsRequired: 3,
            isPremium: true,
            isActive: true,
            displayOrder: 3
        }
    ]

    for (const model of models) {
        try {
            const created = await prisma.photoModel.create({
                data: model
            })
            console.log(`✅ ${created.name}`)
        } catch (error) {
            console.log(`⚠️  ${model.name} (já existe ou erro)`)
        }
    }

    const count = await prisma.photoModel.count()
    console.log(`\n🎉 Total de modelos no banco: ${count}`)
    console.log('✅ Recarregue /admin/models')
}

createSampleModels()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
