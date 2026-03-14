
import { prisma } from '../src/lib/prisma'

async function testPrisma() {
    try {
        console.log("Testando Prisma...");
        const count = await prisma.userAvatar.count();
        console.log(`Sucesso! Total de avatares: ${count}`);
    } catch (error: any) {
        console.error("ERRO NO PRISMA:", error.message);
        console.log("Modelos disponíveis:", Object.keys(prisma).filter(k => !k.startsWith('_')));
    }
}

testPrisma();
