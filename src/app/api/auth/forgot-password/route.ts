
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import crypto from "crypto"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json({ error: "Email obrigatório" }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            // Retorna sucesso para não revelar emails cadastrados (segurança)
            return NextResponse.json({ success: true })
        }

        // Gera token
        const token = crypto.randomBytes(32).toString("hex")
        const expires = new Date(Date.now() + 3600 * 1000) // 1 hora

        // Salva token (usa tabela VerificationToken que já existe)
        // Primeiro remove tokens antigos desse email se houver (opcional, mas limpa o banco)
        await prisma.verificationToken.deleteMany({
            where: { identifier: email }
        })

        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token,
                expires
            }
        })

        // Envia email
        if (resend) {
            const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

            await resend.emails.send({
                from: 'Ensaios.AI <onboarding@resend.dev>',
                to: email,
                subject: 'Recuperação de Senha',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Recuperar Senha</h2>
                        <p>Recebemos uma solicitação para redefinir sua senha.</p>
                        <p>Clique no botão abaixo para criar uma nova senha:</p>
                        <br/>
                        <a href="${resetLink}" style="background-color: #eab308; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Redefinir Senha</a>
                        <br/><br/>
                        <p>Link válido por 1 hora.</p>
                        <p>Se você não solicitou isso, apenas ignore este email.</p>
                    </div>
                `
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Erro reset senha:", error)
        return NextResponse.json({ error: "Erro ao processar" }, { status: 500 })
    }
}
