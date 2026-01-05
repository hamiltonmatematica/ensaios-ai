const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const ADMIN_EMAIL = 'hamilton.vinicius@gmail.com';
const ADMIN_PASSWORD = 'hamilton.vinicius@gmail.com';

async function createAdmin() {
    console.log('🧹 Limpando usuários existentes...\n');

    // 1. Deletar todos os usuários do Supabase Auth
    const { data: { users } } = await supabase.auth.admin.listUsers();

    for (const user of users) {
        await supabase.auth.admin.deleteUser(user.id);
        console.log(`   ✅ Deletado: ${user.email}`);
    }

    console.log('\n👤 Criando admin...\n');

    // 2. Criar usuário no Supabase Auth (com senha correta)
    const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true, // Email já confirmado
        user_metadata: {
            name: 'Hamilton Vinícius',
            role: 'ADMIN'
        }
    });

    if (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }

    console.log(`✅ Admin criado no Supabase Auth!`);
    console.log(`   ID: ${newUser.user?.id}`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Senha: ${ADMIN_PASSWORD}`);
    console.log('\n🎉 Pronto! Agora você pode fazer login em http://localhost:3000/login');
}

createAdmin()
    .catch(console.error)
    .finally(() => process.exit(0));
