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
