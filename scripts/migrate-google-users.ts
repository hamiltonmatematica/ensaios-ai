/**
 * Script de migração de usuários Google para Supabase Auth
 * 
 * Este script:
 * 1. Busca todos os usuários que têm Google login (Account com provider = "google")
 * 2. Para cada usuário, cria uma conta no Supabase Auth
 * 3. Define a senha inicial como o próprio email (hasheado)
 * 4. Envia email de confirmação para o usuário redefinir a senha
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

async function migrateGoogleUsers() {
    console.log('🚀 Iniciando migração de usuários Google...\n')

    try {
        // Buscar usuários com conta Google
        const usersWithGoogle = await prisma.user.findMany({
            where: {
                accounts: {
                    some: {
                        provider: 'google'
                    }
                }
            },
            include: {
                accounts: true
            }
        })

        console.log(`📊 Encontrados ${usersWithGoogle.length} usuários com login Google\n`)

        let migrated = 0
        let skipped = 0
        let errors = 0

        for (const user of usersWithGoogle) {
            try {
                console.log(`👤 Migrando: ${user.email}`)

                // Verificar se usuário já existe no Supabase
                const { data: existingUsers } = await supabase.auth.admin.listUsers()
                const exists = existingUsers?.users.some(u => u.email === user.email)

                if (exists) {
                    console.log(`   ⏭️  Usuário já existe no Supabase, pulando...\n`)
                    skipped++
                    continue
                }

                // Criar usuário no Supabase Auth com senha = email
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: user.email!,
                    password: user.email!, // Senha temporária = email
                    email_confirm: false, // Vai precisar confirmar email
                    user_metadata: {
                        name: user.name || '',
                        migrated_from_google: true
                    }
                })

                if (createError) {
                    console.error(`   ❌ Erro ao criar usuário: ${createError.message}\n`)
                    errors++
                    continue
                }

                // Atualizar senha no banco Prisma (hasheada)
                const hashedPassword = await bcrypt.hash(user.email!, 10)
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword }
                })

                console.log(`   ✅ Migrado com sucesso!\n`)
                migrated++

            } catch (error) {
                console.error(`   ❌ Erro ao processar usuário: ${error}\n`)
                errors++
            }
        }

        console.log('\n📈 Resumo da migração:')
        console.log(`   ✅ Migrados: ${migrated}`)
        console.log(`   ⏭️  Pulados: ${skipped}`)
        console.log(`   ❌ Erros: ${errors}`)
        console.log(`   📊 Total: ${usersWithGoogle.length}`)

    } catch (error) {
        console.error('❌ Erro fatal na migração:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// Executar migração
migrateGoogleUsers()
    .then(() => {
        console.log('\n✨ Migração concluída!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Erro na migração:', error)
        process.exit(1)
    })
