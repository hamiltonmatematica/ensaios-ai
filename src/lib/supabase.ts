import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Cliente admin (para backend - tem permissão total)
export const supabaseAdmin = supabaseServiceKey && supabaseUrl
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

// Nome do bucket para thumbnails
export const THUMBNAILS_BUCKET = 'thumbnails'

// Upload de imagem base64 para Supabase Storage
export async function uploadImage(
    base64Data: string,
    fileName: string
): Promise<string | null> {
    if (!supabaseAdmin) {
        console.error('Supabase admin client não configurado')
        return null
    }

    try {
        // Remove prefixo data:image/...;base64,
        const base64Content = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data

        // Detecta o tipo da imagem
        const mimeMatch = base64Data.match(/data:([^;]+);/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
        const extension = mimeType.split('/')[1] || 'jpg'

        // Converte base64 para Buffer
        const buffer = Buffer.from(base64Content, 'base64')

        // Nome único para o arquivo
        const uniqueFileName = `${Date.now()}-${fileName}.${extension}`

        // Upload para o Supabase Storage
        const { data, error } = await supabaseAdmin.storage
            .from(THUMBNAILS_BUCKET)
            .upload(uniqueFileName, buffer, {
                contentType: mimeType,
                upsert: true
            })

        if (error) {
            console.error('Erro no upload:', error)
            return null
        }

        // Retorna URL pública
        const { data: publicUrl } = supabaseAdmin.storage
            .from(THUMBNAILS_BUCKET)
            .getPublicUrl(data.path)

        return publicUrl.publicUrl
    } catch (error) {
        console.error('Erro ao fazer upload:', error)
        return null
    }
}
