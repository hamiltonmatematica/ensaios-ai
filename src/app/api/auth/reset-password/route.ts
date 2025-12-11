
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json()

        if (!token || !password) {
            return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
        }

        // Busca token válido
        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token }
        })

        if (!verificationToken) {
            return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 })
        }

        if (new Date() > verificationToken.expires) {
            return NextResponse.json({ error: "Token expirado" }, { status: 400 })
        }

        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(password, 10)

        // Atualiza usuário
        await prisma.user.update({
            where: { email: verificationToken.identifier },
            data: { password: hashedPassword }
        })

        // Deleta o token usado
        await prisma.verificationToken.delete({
            where: { token }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Erro ao resetar senha:", error)
        return NextResponse.json({ error: "Erro ao atualizar senha" }, { status: 500 })
    }
}
