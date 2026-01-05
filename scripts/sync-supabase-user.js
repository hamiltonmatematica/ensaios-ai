const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const prisma = new PrismaClient()

async function syncSupabaseUsers() {
    console.log('🔄 Sincronizando usuários Supabase → Prisma\n')

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
        console.error('❌ Erro:', error.message)
        return
    }

    console.log(`📋 ${users.length} usuário(s) no Supabase\n`)

    for (const user of users) {
        try {
            const prismaUser = await prisma.user.upsert({
                where: { id: user.id },
                update: {
                    email: user.email,
                    name: user.user_metadata?.name || user.email.split('@')[0],
                },
                create: {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email.split('@')[0],
                    role: 'ADMIN',
                    emailVerified: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
                    creditBalance: {
                        create: {
                            totalCredits: 10000  // ← Campo correto!
                        }
                    }
                },
                include: {
                    creditBalance: true
                }
            })

            console.log(`✅ ${prismaUser.email}`)
            console.log(`   ID: ${prismaUser.id}`)
            console.log(`   Role: ${prismaUser.role}`)
            console.log(`   Créditos: ${prismaUser.creditBalance?.totalCredits || 0}\n`)

        } catch (error) {
            console.error(`❌ ${user.email}: ${error.message}\n`)
        }
    }

    console.log('🎉 PRONTO!')
    console.log('\n🔄 Recarregue estas páginas:')
    console.log('   • /admin/users (você vai aparecer)')
    console.log('   • /dashboard (seus créditos vão aparecer)')
    console.log('   • Ferramentas funcionarão agora!\n')
}

syncSupabaseUsers()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
