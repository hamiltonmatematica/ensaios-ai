import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log("URL:", supabaseUrl);
console.log("Key length:", supabaseServiceKey.length);

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variáveis de ambiente do Supabase não encontradas no .env')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupBucket() {
    console.log("Verificando buckets no Supabase...");
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
        console.error("Erro ao listar buckets:", listError.message);
        return;
    }

    const hasThumbnails = buckets.some(b => b.name === 'thumbnails');

    if (!hasThumbnails) {
        console.log("Criando bucket 'thumbnails'...");
        const { error: createError } = await supabase.storage.createBucket('thumbnails', {
            public: true,
            fileSizeLimit: 20480000, // 20MB
        });

        if (createError) {
            console.error("Erro ao criar bucket:", createError.message);
        } else {
            console.log("Bucket 'thumbnails' criado com sucesso.");
        }
    } else {
        console.log("Bucket 'thumbnails' já existe.");
    }
}

setupBucket();
