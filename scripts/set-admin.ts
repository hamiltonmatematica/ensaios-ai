import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2]

    if (!email) {
        console.error("Por favor, forneça um email. Ex: npx tsx scripts/set-admin.ts user@example.com")
        process.exit(1)
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: "ADMIN" }
        })

        console.log(`✅ Usuário ${user.email} agora é ADMIN!`)
        console.log("Você pode acessar o painel em: http://localhost:3000/admin")
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error)
        console.log("Verifique se o email está correto e se o usuário já fez login alguma vez.")
    } finally {
        await prisma.$disconnect()
    }
}

main()
