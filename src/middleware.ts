import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
    '/login',
    '/recuperar-senha',
    '/redefinir-senha',
    '/email-confirmado',
    '/auth/callback',
    '/support',
    '/api/auth',
    '/_next',
    '/favicon.ico',
]

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Permitir acesso a rotas públicas
    // Verifica exatamente a rota raiz ou rotas que começam com os padrões
    if (pathname === '/' || publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        supabaseResponse.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // Verifica se o usuário está autenticado
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Se não estiver autenticado e não estiver em uma rota pública, redireciona para login
    if (!user) {
        const redirectUrl = new URL('/login', request.url)
        return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
