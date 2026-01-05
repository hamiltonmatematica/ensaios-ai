/**
 * Script para limpar todos os usuários do sistema
 * 
 * ATENÇÃO: Este script irá DELETAR TODOS os usuários do banco Prisma e do Supabase Auth
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

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

async function cleanupAllUsers() {
    console.log('🧹 Iniciando limpeza de TODOS os usuários...\n')
    console.log('⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!\n')

    try {
        // 1. Deletar todos os usuários do Supabase Auth
        console.log('📋 Buscando usuários no Supabase Auth...')
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

        if (listError) {
            console.error('❌ Erro ao listar usuários:', listError)
            throw listError
        }

        console.log(`   Encontrados ${users.length} usuários no Supabase Auth\n`)

        if (users.length > 0) {
            console.log('🗑️  Deletando usuários do Supabase Auth...')
            for (const user of users) {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
                if (deleteError) {
                    console.error(`   ❌ Erro ao deletar ${user.email}:`, deleteError)
                } else {
                    console.log(`   ✅ Deletado: ${user.email}`)
                }
            }
        }

        // 2. Deletar todos os usuários do Prisma
        console.log('\n🗑️  Deletando usuários do banco Prisma...')
        const deletedCount = await prisma.user.deleteMany({})
        console.log(`   ✅ ${deletedCount.count} usuários deletados do Prisma\n`)

        console.log('✨ Limpeza concluída com sucesso!')
        console.log('   Todos os usuários foram removidos do sistema.\n')

    } catch (error) {
        console.error('❌ Erro durante limpeza:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// Executar limpeza
cleanupAllUsers()
    .then(() => {
        console.log('✅ Pronto para criar novo usuário admin!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Erro:', error)
        process.exit(1)
    })
