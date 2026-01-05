const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

const prisma = new PrismaClient()

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateUsers() {
    try {
        console.log('🚀 Iniciando migração de usuários do Prisma para Supabase...\n')

        // Buscar todos os usuários do Prisma
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                credits: true,
                createdAt: true,
                creditBalance: {
                    select: {
                        totalCredits: true
                    }
                }
            }
        })

        console.log(`📊 Encontrados ${users.length} usuários para migrar\n`)

        let successCount = 0
        let errorCount = 0
        const errors = []

        for (const user of users) {
            try {
                console.log(`\n🔄 Migrando: ${user.email} (${user.role})`)

                // Criar usuário no Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: user.email,
                    email_confirm: true, // Já confirmar o email
                    user_metadata: {
                        name: user.name,
                        role: user.role,
                        migrated_from_prisma: true,
                        prisma_id: user.id,
                        original_credits: user.credits,
                        total_credits: user.creditBalance?.totalCredits || user.credits,
                        migrated_at: new Date().toISOString()
                    }
                })

                if (authError) {
                    // Se o erro for "usuário já existe", tenta buscar e atualizar
                    if (authError.message.includes('already registered')) {
                        console.log(`   ⚠️  Usuário já existe, tentando atualizar metadados...`)

                        // Buscar usuário existente
                        const { data: existingUsers } = await supabase.auth.admin.listUsers()
                        const existingUser = existingUsers.users.find(u => u.email === user.email)

                        if (existingUser) {
                            // Atualizar metadados
                            const { error: updateError } = await supabase.auth.admin.updateUserById(
                                existingUser.id,
                                {
                                    user_metadata: {
                                        name: user.name,
                                        role: user.role,
                                        migrated_from_prisma: true,
                                        prisma_id: user.id,
                                        original_credits: user.credits,
                                        total_credits: user.creditBalance?.totalCredits || user.credits,
                                        migrated_at: new Date().toISOString()
                                    }
                                }
                            )

                            if (updateError) {
                                throw updateError
                            }

                            console.log(`   ✅ Metadados atualizados!`)
                            successCount++
                        } else {
                            throw new Error('Usuário existe mas não foi encontrado')
                        }
                    } else {
                        throw authError
                    }
                } else {
                    console.log(`   ✅ Criado com sucesso! ID: ${authData.user.id}`)
                    console.log(`   📝 Créditos: ${user.creditBalance?.totalCredits || user.credits}`)
                    successCount++
                }

            } catch (error) {
                console.error(`   ❌ Erro: ${error.message}`)
                errorCount++
                errors.push({
                    email: user.email,
                    error: error.message
                })
            }
        }

        console.log('\n' + '='.repeat(60))
        console.log('\n📊 RESUMO DA MIGRAÇÃO:')
        console.log(`   ✅ Sucesso: ${successCount}`)
        console.log(`   ❌ Erros: ${errorCount}`)
        console.log(`   📈 Total: ${users.length}`)

        if (errors.length > 0) {
            console.log('\n❌ Erros encontrados:')
            errors.forEach(err => {
                console.log(`   • ${err.email}: ${err.error}`)
            })
        }

        console.log('\n' + '='.repeat(60))
        console.log('\n✨ Migração concluída!')

        // Instruções importantes
        console.log('\n📌 PRÓXIMOS PASSOS:')
        console.log('   1. Verificar usuários no Supabase Dashboard')
        console.log('   2. Os usuários precisarão redefinir suas senhas')
        console.log('   3. Enviar email de boas-vindas/redefinição de senha')

    } catch (error) {
        console.error('\n❌ Erro fatal:', error.message)
    } finally {
        await prisma.$disconnect()
    }
}

migrateUsers()
