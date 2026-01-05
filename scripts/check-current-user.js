const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCurrentUser() {
    try {
        console.log('🔍 Verificando usuário atual no Supabase...\n')

        // Buscar usuário hamilton.vinicius@gmail.com
        const { data: users, error } = await supabase.auth.admin.listUsers()

        if (error) {
            console.error('❌ Erro ao buscar usuários:', error.message)
            return
        }

        const hamiltonUser = users.users.find(u => u.email === 'hamilton.vinicius@gmail.com')

        if (!hamiltonUser) {
            console.log('❌ Usuário hamilton.vinicius@gmail.com NÃO encontrado no Supabase\n')
            console.log('📝 Usuário precisa ser criado.')
            return
        }

        console.log('✅ Usuário encontrado!\n')
        console.log('📊 Informações:')
        console.log(`   ID: ${hamiltonUser.id}`)
        console.log(`   Email: ${hamiltonUser.email}`)
        console.log(`   Confirmado: ${hamiltonUser.email_confirmed_at ? 'Sim' : 'Não'}`)
        console.log(`   Criado em: ${new Date(hamiltonUser.created_at).toLocaleString('pt-BR')}`)
        console.log(`   Último login: ${hamiltonUser.last_sign_in_at ? new Date(hamiltonUser.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca'}`)

        console.log('\n📝 Metadados:')
        console.log(JSON.stringify(hamiltonUser.user_metadata, null, 2))

        // Verificar se precisa atualizar
        const needsUpdate = !hamiltonUser.user_metadata?.role || hamiltonUser.user_metadata.role !== 'ADMIN'

        if (needsUpdate) {
            console.log('\n⚠️  Usuário precisa ser atualizado para ADMIN com créditos')
        } else {
            console.log('\n✅ Usuário já está configurado corretamente!')
        }

    } catch (error) {
        console.error('❌ Erro:', error.message)
    }
}

checkCurrentUser()
