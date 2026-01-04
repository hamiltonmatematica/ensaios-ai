-- SQL Script para criar CreditBalance para todos os usuários sem ele
-- Execute este script diretamente no Supabase Dashboard ou via psql

-- Criar CreditBalance para todos os usuários que não têm
INSERT INTO "CreditBalance" ("id", "userId", "totalCredits", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid() as id,
    u.id as "userId",
    u.credits as "totalCredits",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "User" u
LEFT JOIN "CreditBalance" cb ON cb."userId" = u.id
WHERE cb.id IS NULL;

-- Verificar quantos foram criados
SELECT COUNT(*) as "Usuarios_Migrados" 
FROM "CreditBalance";

-- Ver alguns exemplos
SELECT u.email, u.credits as "Credits_Legado", cb."totalCredits" as "CreditBalance_Novo"
FROM "User" u
LEFT JOIN "CreditBalance" cb ON cb."userId" = u.id
LIMIT 10;
