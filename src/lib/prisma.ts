import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Se não tiver DATABASE_URL, retorna client sem adapter (para build sem DB)
  if (!process.env.DATABASE_URL) {
    return new PrismaClient()
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Configurações para melhor estabilidade com Supabase Transaction Pooler
    max: 5, // Máximo de conexões no pool
    idleTimeoutMillis: 30000, // 30 segundos de timeout ocioso
    connectionTimeoutMillis: 10000, // 10 segundos para conectar
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

