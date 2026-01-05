import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
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
                // Verificar se o usuário existe na tabela public.User
                // Isso corrige o erro de FK se o trigger de sync falhar ou não existir
                let dbUser = await prisma.user.findUnique({ where: { id: user.id } })

                if (!dbUser) {
                    try {
                        console.log(`[Session] User record missing for ${user.id}. Creating fallback...`)
                        dbUser = await prisma.user.create({
                            data: {
                                id: user.id,
                                email: user.email!, // Supabase Auth user always has email
                                name: user.user_metadata?.name || user.email?.split('@')[0],
                                credits: 20, // Default 20 for new users created via fallback
                            }
                        })

                        // Também criar CreditBalance se for criação fallback
                        await prisma.creditBalance.create({
                            data: { userId: user.id, totalCredits: 20 }
                        })
                    } catch (err) {
                        console.error("[Session] Error creating fallback user:", err)
                        // Se falhar (ex: race condition), tentamos prosseguir
                    }
                }

                // Verifica quantas sessões ativas o usuário tem
                const sessions = await prisma.userSession.findMany({
                    where: {
                        userId: user.id,
                        expiresAt: { gt: new Date() }
                    }
                })

                if (sessions.length >= MAX_DEVICES) {
                    return NextResponse.json(
                        {
                            error: 'Limite de dispositivos atingido',
                            message: 'Você já está conectado em outro dispositivo',
                            sessions: sessions.map(s => ({
                                id: s.id,
                                device: s.deviceInfo,
                                ip: s.ipAddress,
                                createdAt: s.createdAt,
                            })),
                        },
                        { status: 403 }
                    )
                }

                // Cria nova sessão
                const userAgent = request.headers.get('user-agent') || 'Unknown'
                const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'
                const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)

                await prisma.userSession.create({
                    data: {
                        userId: user.id,
                        deviceInfo: userAgent,
                        ipAddress: ip,
                        expiresAt
                    }
                })

                return NextResponse.json({ success: true })
            }

            case 'validate': {
                // Valida se a sessão ainda está ativa
                const activeSession = await prisma.userSession.findFirst({
                    where: {
                        userId: user.id,
                        expiresAt: { gt: new Date() }
                    }
                })

                return NextResponse.json({ valid: !!activeSession })
            }

            case 'delete': {
                // Remove sessões do usuário
                await prisma.userSession.deleteMany({
                    where: { userId: user.id }
                })

                return NextResponse.json({ success: true })
            }

            case 'deleteOther': {
                if (!sessionId) {
                    return NextResponse.json({ error: 'Session ID necessário' }, { status: 400 })
                }

                await prisma.userSession.deleteMany({
                    where: {
                        id: sessionId,
                        userId: user.id
                    }
                })

                return NextResponse.json({ success: true })
            }

            case 'list': {
                const sessions = await prisma.userSession.findMany({
                    where: {
                        userId: user.id,
                        expiresAt: { gt: new Date() }
                    },
                    orderBy: { createdAt: 'desc' }
                })

                return NextResponse.json({
                    sessions: sessions.map(s => ({
                        id: s.id,
                        device: s.deviceInfo,
                        ip: s.ipAddress,
                        createdAt: s.createdAt,
                        expiresAt: s.expiresAt,
                    }))
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
