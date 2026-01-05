import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const MAX_DEVICES = 1 // Limite de dispositivos simultâneos
const SESSION_HOURS = 8 // Tempo de expiração da sessão em horas

export async function POST(request: Request) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { action, sessionId } = await request.json()

    try {
        switch (action) {
            case 'create': {
                // Verifica quantas sessões ativas o usuário tem
                const { data: sessions, error: countError } = await supabase
                    .from('ap_user_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('expires_at', new Date().toISOString())

                if (countError) {
                    console.error('Error counting sessions:', countError)
                    return NextResponse.json({ error: 'Erro ao verificar sessões' }, { status: 500 })
                }

                if (sessions && sessions.length >= MAX_DEVICES) {
                    return NextResponse.json(
                        {
                            error: 'Limite de dispositivos atingido',
                            message: 'Você já está conectado em outro dispositivo',
                            sessions: sessions.map(s => ({
                                id: s.id,
                                device: s.device_info,
                                ip: s.ip_address,
                                createdAt: s.created_at,
                            })),
                        },
                        { status: 403 }
                    )
                }

                // Cria nova sessão
                const userAgent = request.headers.get('user-agent') || 'Unknown'
                const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'
                const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)

                const { error: insertError } = await supabase
                    .from('ap_user_sessions')
                    .insert({
                        user_id: user.id,
                        device_info: userAgent,
                        ip_address: ip,
                        expires_at: expiresAt.toISOString(),
                    })

                if (insertError) {
                    console.error('Error creating session:', insertError)
                    return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
                }

                return NextResponse.json({ success: true })
            }

            case 'validate': {
                // Valida se a sessão ainda está ativa
                const { data: sessions } = await supabase
                    .from('ap_user_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('expires_at', new Date().toISOString())

                return NextResponse.json({ valid: sessions && sessions.length > 0 })
            }

            case 'delete': {
                // Remove sessão atual
                const { error } = await supabase
                    .from('ap_user_sessions')
                    .delete()
                    .eq('user_id', user.id)

                if (error) {
                    console.error('Error deleting session:', error)
                    return NextResponse.json({ error: 'Erro ao deletar sessão' }, { status: 500 })
                }

                return NextResponse.json({ success: true })
            }

            case 'deleteOther': {
                // Remove outra sessão específica
                if (!sessionId) {
                    return NextResponse.json({ error: 'Session ID necessário' }, { status: 400 })
                }

                const { error } = await supabase
                    .from('ap_user_sessions')
                    .delete()
                    .eq('id', sessionId)
                    .eq('user_id', user.id)

                if (error) {
                    console.error('Error deleting other session:', error)
                    return NextResponse.json({ error: 'Erro ao deletar sessão' }, { status: 500 })
                }

                return NextResponse.json({ success: true })
            }

            case 'list': {
                // Lista todas as sessões ativas
                const { data: sessions, error } = await supabase
                    .from('ap_user_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error listing sessions:', error)
                    return NextResponse.json({ error: 'Erro ao listar sessões' }, { status: 500 })
                }

                return NextResponse.json({
                    sessions: sessions?.map(s => ({
                        id: s.id,
                        device: s.device_info,
                        ip: s.ip_address,
                        createdAt: s.created_at,
                        expiresAt: s.expires_at,
                    })) || [],
                })
            }

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }
    } catch (error) {
        console.error('Session API error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
