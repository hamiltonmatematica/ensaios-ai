
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email e senha são obrigatórios" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "A senha deve ter pelo menos 6 caracteres" },
                { status: 400 }
            )
        }

        // Verifica se usuário já existe
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "Este email já está cadastrado" },
                { status: 400 }
            )
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10)

        // Cria usuário
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: email.split("@")[0],
                credits: 3, // 3 créditos grátis
            },
        })

        // Envia email de boas-vindas
        if (resend) {
            try {
                await resend.emails.send({
                    from: 'Ensaios.AI <onboarding@resend.dev>',
                    to: email,
                    subject: 'Bem-vindo ao Ensaios.ai!',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1>Bem-vindo ao Ensaios.ai! 📸</h1>
                            <p>Olá,</p>
                            <p>Ficamos muito felizes em ter você conosco.</p>
                            <p>Sua conta foi criada com sucesso e você já ganhou <strong>3 créditos gratuitos</strong> para gerar seus primeiros ensaios fotográficos com Inteligência Artificial.</p>
                            <br/>
                            <a href="${process.env.NEXTAUTH_URL}" style="background-color: #eab308; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Plataforma</a>
                            <br/><br/>
                            <p>Se tiver dúvidas, responda a este email ou use nossa área de suporte.</p>
                            <p>Att,<br/>Equipe Ensaios.ai</p>
                        </div>
                    `
                })
            } catch (emailError) {
                console.error("Erro ao enviar email de boas-vindas:", emailError)
                // Não falha o cadastro se o email falhar
            }
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            }
        })

    } catch (error) {
        console.error("Erro no registro:", error)
        return NextResponse.json(
            { error: "Erro ao criar conta" },
            { status: 500 }
        )
    }
}
