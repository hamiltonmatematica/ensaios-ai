import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
    console.log('🌱 Criando tags...')

    // Criar tags
    const tags = [
        { name: 'Homem', slug: 'homem', color: '#3b82f6' },
        { name: 'Mulher', slug: 'mulher', color: '#ec4899' },
        { name: 'Escritório', slug: 'escritorio', color: '#6366f1' },
        { name: 'Artístico', slug: 'artistico', color: '#8b5cf6' },
        { name: 'Casual', slug: 'casual', color: '#22c55e' },
        { name: 'Profissional', slug: 'profissional', color: '#f97316' },
    ]

    for (const tag of tags) {
        await prisma.tag.upsert({
            where: { slug: tag.slug },
            update: {},
            create: tag
        })
        console.log(`  ✓ Tag: ${tag.name}`)
    }

    console.log('\n🖼️  Criando modelos de ensaio...')

    // Buscar tags criadas
    const tagHomem = await prisma.tag.findUnique({ where: { slug: 'homem' } })
    const tagMulher = await prisma.tag.findUnique({ where: { slug: 'mulher' } })
    const tagEscritorio = await prisma.tag.findUnique({ where: { slug: 'escritorio' } })
    const tagArtistico = await prisma.tag.findUnique({ where: { slug: 'artistico' } })
    const tagCasual = await prisma.tag.findUnique({ where: { slug: 'casual' } })
    const tagProfissional = await prisma.tag.findUnique({ where: { slug: 'profissional' } })

    // Modelos de ensaio
    const models = [
        {
            name: 'CEO Executivo',
            description: 'Foto profissional estilo CEO de grande empresa',
            thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
            promptTemplate: 'Professional headshot of a confident CEO in a modern corner office with city skyline view, wearing an elegant business suit, warm lighting, high-end corporate photography style, 8K quality',
            isFree: true,
            creditsRequired: 0,
            displayOrder: 1,
            tagIds: [tagHomem?.id, tagProfissional?.id, tagEscritorio?.id].filter(Boolean)
        },
        {
            name: 'Executiva Moderna',
            description: 'Foto profissional para mulheres executivas',
            thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
            promptTemplate: 'Professional headshot of a confident businesswoman in a sleek modern office, wearing elegant professional attire, natural lighting, high-end corporate photography, empowering pose, 8K quality',
            isFree: true,
            creditsRequired: 0,
            displayOrder: 2,
            tagIds: [tagMulher?.id, tagProfissional?.id, tagEscritorio?.id].filter(Boolean)
        },
        {
            name: 'LinkedIn Premium',
            description: 'Foto perfeita para perfil LinkedIn',
            thumbnailUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
            promptTemplate: 'Professional LinkedIn profile photo, clean neutral background, friendly approachable smile, business casual attire, soft studio lighting, sharp focus on face, high resolution professional headshot',
            isFree: false,
            creditsRequired: 1,
            displayOrder: 3,
            tagIds: [tagHomem?.id, tagMulher?.id, tagProfissional?.id].filter(Boolean)
        },
        {
            name: 'Artístico P&B',
            description: 'Ensaio artístico em preto e branco',
            thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
            promptTemplate: 'Artistic black and white portrait, dramatic lighting, high contrast, studio photography, elegant pose, fashion editorial style, moody atmosphere, fine art photography, 8K',
            isFree: false,
            creditsRequired: 1,
            displayOrder: 4,
            tagIds: [tagArtistico?.id].filter(Boolean)
        },
        {
            name: 'Casual Lifestyle',
            description: 'Foto natural para redes sociais',
            thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
            promptTemplate: 'Natural lifestyle portrait, outdoor setting with beautiful golden hour lighting, casual stylish outfit, genuine relaxed smile, Instagram worthy aesthetic, bokeh background, high quality DSLR photo',
            isFree: false,
            creditsRequired: 1,
            displayOrder: 5,
            tagIds: [tagCasual?.id].filter(Boolean)
        },
        {
            name: 'Tech Startup',
            description: 'Estilo descontraído de startup de tecnologia',
            thumbnailUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
            promptTemplate: 'Modern tech startup founder portrait, casual smart outfit, contemporary office or co-working space background, confident relaxed pose, natural lighting, Silicon Valley aesthetic, professional but approachable',
            isFree: false,
            creditsRequired: 1,
            displayOrder: 6,
            tagIds: [tagHomem?.id, tagProfissional?.id, tagCasual?.id].filter(Boolean)
        }
    ]

    for (const model of models) {
        const { tagIds, isFree, ...modelData } = model
        await prisma.photoModel.create({
            data: {
                ...modelData,
                isPremium: !isFree,
                tags: {
                    connect: tagIds.map(id => ({ id }))
                }
            }
        })
        console.log(`  ✓ Modelo: ${model.name}`)
    }

    console.log('\n✅ Seed completo!')
    console.log(`   - ${tags.length} tags criadas`)
    console.log(`   - ${models.length} modelos criados`)


}

seed().catch(console.error)
