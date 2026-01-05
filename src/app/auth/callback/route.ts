import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const tokenHash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type') as 'recovery' | 'email' | 'magiclink' | 'signup' | 'email_change' | null
    const next = requestUrl.searchParams.get('next') || '/'

    if (tokenHash && type) {
        const supabase = await createClient()

        try {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type,
            })

            if (!error) {
                // Redirecionar baseado no tipo
                if (type === 'recovery') {
                    // verifyOtp já criou a sessão, só redireciona
                    return NextResponse.redirect(new URL('/redefinir-senha', request.url))
                } else if (type === 'signup' || type === 'email') {
                    return NextResponse.redirect(new URL('/email-confirmado', request.url))
                } else if (type === 'email_change') {
                    return NextResponse.redirect(new URL(next, request.url))
                } else if (type === 'magiclink') {
                    return NextResponse.redirect(new URL(next, request.url))
                }
            }
        } catch (error) {
            console.error('Error verifying OTP:', error)
        }
    }

    // Se houver erro ou não houver token, redireciona para login
    // Se houver erro ou não houver token, redireciona para login com detalhes
    const errorMsg = requestUrl.searchParams.get('error_description') || 'Falha na verificação'
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url))
}
