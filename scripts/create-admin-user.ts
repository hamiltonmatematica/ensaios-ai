/**
 * Script para criar usuário admin no Supabase Auth e Prisma
 * 
 * Email: hamilton.vinicius@gmail.com
 * Senha: hamilton.vinicius@gmail.com
 * Role: ADMIN
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente Supabase não configuradas')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

const ADMIN_EMAIL = 'hamilton.vinicius@gmail.com'
const ADMIN_PASSWORD = 'hamilton.vinicius@gmail.com'
const ADMIN_NAME = 'Hamilton Vinícius'

async function createAdminUser() {
    console.log('👤 Criando usuário ADMIN...\n')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Senha: ${ADMIN_PASSWORD}`)
    console.log(`   Role: ADMIN\n`)

    try {
        // 1. Verificar se usuário já existe no Supabase
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existingSupabaseUser = users.find(u => u.email === ADMIN_EMAIL)

        let supabaseUserId: string

        if (existingSupabaseUser) {
            console.log('⚠️  Usuário já existe no Supabase Auth, usando existente...')
            supabaseUserId = existingSupabaseUser.id
        } else {
            // Criar usuário no Supabase Auth
            console.log('🔐 Criando usuário no Supabase Auth...')
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                email_confirm: true, // Email já confirmado
                user_metadata: {
                    name: ADMIN_NAME,
                    role: 'ADMIN'
                }
            })

            if (createError) {
                console.error('❌ Erro ao criar usuário no Supabase:', createError)
                throw createError
            }

            supabaseUserId = newUser.user!.id
            console.log(`   ✅ Criado no Supabase com ID: ${supabaseUserId}\n`)
        }

        // 2. Verificar se usuário já existe no Prisma
        const existingPrismaUser = await prisma.user.findUnique({
            where: { email: ADMIN_EMAIL }
        })

        if (existingPrismaUser) {
            console.log('⚠️  Usuário já existe no Prisma, atualizando...')

            // Atualizar usuário existente
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)

            await prisma.user.update({
                where: { email: ADMIN_EMAIL },
                data: {
                    name: ADMIN_NAME,
                    password: hashedPassword,
                    role: 'ADMIN',
                    emailVerified: new Date(),
                    creditBalance: {
                        upsert: {
                            create: { totalCredits: 1000 },
                            update: { totalCredits: 1000 }
                        }
                    }
                }
            })

            console.log('   ✅ Usuário atualizado no Prisma\n')
        } else {
            // Criar novo usuário no Prisma
            console.log('💾 Criando usuário no banco Prisma...')
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)

            await prisma.user.create({
                data: {
                    email: ADMIN_EMAIL,
                    name: ADMIN_NAME,
                    password: hashedPassword,
                    role: 'ADMIN',
                    credits: 1000,
                    emailVerified: new Date(),
                    creditBalance: {
                        create: {
                            totalCredits: 1000
                        }
                    }
                }
            })

            console.log('   ✅ Criado no Prisma com 1000 créditos\n')
        }

        console.log('✨ Usuário ADMIN criado com sucesso!\n')
        console.log('📋 Detalhes do login:')
        console.log(`   Email: ${ADMIN_EMAIL}`)
        console.log(`   Senha: ${ADMIN_PASSWORD}`)
        console.log(`   URL: http://localhost:3000/login`)
        console.log('\n🎉 Você já pode fazer login!')

    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// Executar criação
createAdminUser()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Erro:', error)
        process.exit(1)
    })
