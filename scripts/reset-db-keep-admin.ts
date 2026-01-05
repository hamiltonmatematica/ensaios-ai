
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const adminEmail = "hamilton.vinicius@gmail.com"

    console.log(`🔒 Preservando admin: ${adminEmail}`)

    const admin = await prisma.user.findUnique({
        where: { email: adminEmail }
    })

    if (!admin) {
        console.error("❌ Admin não encontrado! Abortando limpeza para segurança.")
        process.exit(1)
    }

    console.log(`✅ Admin encontrado (ID: ${admin.id}). Iniciando limpeza...`)

    // 1. Limpar tabelas dependentes (Gerações, Histórico, etc.)
    // Deletar items onde o userId NÃO seja o do admin, ou deletar tudo se não tiver relação direta fácil e for seguro (mas melhor filtrar)

    // Para simplificar e garantir limpeza total, deletamos usuários exceto admin.
    // O Cascade Delete do Prisma (se configurado) cuidaria do resto, mas vamos ser explícitos onde possível.

    console.log("🗑️  Deletando gerações de outros usuários...")
    await prisma.generation.deleteMany({
        where: { userId: { not: admin.id } }
    })

    await prisma.faceSwapJob.deleteMany({
        where: { userId: { not: admin.id } }
    })

    await prisma.imageUpscale.deleteMany({
        where: { userId: { not: admin.id } }
    })

    console.log("🗑️  Deletando transações de outros usuários...")
    await prisma.transaction.deleteMany({
        where: { userId: { not: admin.id } }
    })

    await prisma.creditTransaction.deleteMany({
        where: { userId: { not: admin.id } }
    })

    await prisma.creditBalance.deleteMany({
        where: { userId: { not: admin.id } }
    })

    // Adicione outras tabelas conforme necessário (SupportMessage, etc)
    await prisma.supportMessage.deleteMany({
        where: { userId: { not: admin.id } }
    })

    // 2. Deletar Usuários
    console.log("🗑️  Deletando outros usuários...")
    const { count } = await prisma.user.deleteMany({
        where: {
            id: { not: admin.id }
        }
    })

    console.log(`✨ Limpeza concluída! ${count} usuários removidos.`)
    console.log(`👤 Apenas ${adminEmail} permanece no banco.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
