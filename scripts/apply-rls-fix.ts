import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🔒 Starting Security Fix: Enabling RLS on all public tables...")

    try {
        // 1. Get all tables in public schema
        const tables: any[] = await prisma.$queryRaw`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT LIKE '_prisma_%';
        `

        console.log(`📋 Found ${tables.length} tables to secure.`)

        let successCount = 0
        let failCount = 0

        for (const t of tables) {
            const tableName = t.tablename
            process.stdout.write(`   Processing ${tableName}... `)
            try {
                // Enable RLS
                await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${tableName}" ENABLE ROW LEVEL SECURITY;`)
                console.log(`✅ Enabled RLS`)
                successCount++
            } catch (e: any) {
                console.log(`❌ Failed`)
                console.error(`      Error:`, e.message)
                failCount++
            }
        }

        console.log("\nSummary:")
        console.log(`✅ Successfully secured ${successCount} tables.`)
        if (failCount > 0) {
            console.log(`❌ Failed to secure ${failCount} tables.`)
        } else {
            console.log("🚀 All tables secured! The 20 vulnerabilities should be resolved.")
        }

    } catch (e: any) {
        console.error("Critical error:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
