
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return false

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })
    return user?.role === "ADMIN"
}

// GET: Listar usuários com métricas
export async function GET() {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: {
                    generations: true,
                    transactions: true
                }
            },
            transactions: {
                where: { status: "completed" }, // ou "paid", dependendo do webhook
                select: { amount: true }
            }
        }
        // Nota: para performance em escala real, agregações deveriam ser feitas de outra forma.
        // Para este MVP, calcular no código JS está ok.
    })

    const formattedUsers = users.map(user => {
        const totalSpent = user.transactions.reduce((acc, curr) => acc + curr.amount, 0)
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            credits: user.credits,
            role: user.role,
            totalGenerations: user._count.generations,
            totalSpent: totalSpent,
            lastAccess: user.updatedAt, // Usando updatedAt como proxy de acesso recente por enquanto
            createdAt: user.createdAt
        }
    })

    return NextResponse.json(formattedUsers)
}

// PATCH: Atualizar um usuário
export async function PATCH(req: Request) {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { id, credits, email, name, role, isActive } = body

        if (!id) {
            return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
        }

        // Verifica se o usuário existe
        const existingUser = await prisma.user.findUnique({
            where: { id }
        })

        if (!existingUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        // Se mudando o email, verifica se já existe outro usuário com esse email
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email }
            })
            if (emailExists) {
                return NextResponse.json({ error: "Este email já está em uso por outro usuário" }, { status: 400 })
            }
        }

        // Monta objeto de atualização apenas com campos fornecidos
        const updateData: Record<string, unknown> = {}
        if (credits !== undefined) updateData.credits = Number(credits)
        if (email !== undefined) updateData.email = email
        if (name !== undefined) updateData.name = name
        if (role !== undefined && (role === "USER" || role === "ADMIN")) updateData.role = role
        if (isActive !== undefined) updateData.isActive = Boolean(isActive)

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({
            success: true,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                credits: updatedUser.credits,
                role: updatedUser.role
            }
        })

    } catch (error) {
        console.error("Erro ao atualizar usuário:", error)
        return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 })
    }
}

// DELETE: Remover um usuário (soft delete ou hard delete)
export async function DELETE(req: Request) {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
        }

        // Verifica se o usuário existe
        const existingUser = await prisma.user.findUnique({
            where: { id }
        })

        if (!existingUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        // Não permite deletar a si mesmo
        const session = await getServerSession(authOptions)
        if (session?.user?.id === id) {
            return NextResponse.json({ error: "Você não pode deletar sua própria conta" }, { status: 400 })
        }

        // Deleta o usuário (isso vai cascatear para deletar gerações, etc. se configurado no schema)
        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({ success: true, message: "Usuário removido com sucesso" })

    } catch (error) {
        console.error("Erro ao deletar usuário:", error)
        return NextResponse.json({ error: "Erro ao deletar usuário" }, { status: 500 })
    }
}
