import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Cliente público (para frontend) - só cria se as variáveis existirem
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// Cliente admin (para backend - tem permissão total)
export const supabaseAdmin: SupabaseClient | null = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

// Nome do bucket para thumbnails
export const THUMBNAILS_BUCKET = 'thumbnails'

// Helper para fazer upload de imagem base64
export async function uploadImage(
    base64Data: string,
    fileName: string
): Promise<string | null> {
    if (!supabaseAdmin) {
        console.error('Supabase admin client não configurado')
        return null
    }

    try {
        // Remove prefixo data:image/...;base64, se existir
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

// Helper para deletar imagem
export async function deleteImage(imageUrl: string): Promise<boolean> {
    if (!supabaseAdmin) return false

    try {
        // Extrai o path do arquivo da URL
        const urlParts = imageUrl.split(`${THUMBNAILS_BUCKET}/`)
        if (urlParts.length < 2) return false

        const filePath = urlParts[1]

        const { error } = await supabaseAdmin.storage
            .from(THUMBNAILS_BUCKET)
            .remove([filePath])

        return !error
    } catch {
        return false
    }
}
