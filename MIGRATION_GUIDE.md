# Como executar a migração de CreditBalance no Vercel/Supabase

## 🚨 PROBLEMA
O login do Google ainda está falhando porque os usuários existentes no banco de produção **não têm registros de CreditBalance**.

## ✅ SOLUÇÃO RÁPIDA

### Opção 1: Via Supabase Dashboard (RECOMENDADO - 2 minutos)

1. **Acesse o Supabase:**
   - Vá em [app.supabase.com](https://app.supabase.com)
   - Selecione seu projeto `ensaios-ai`

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New Query**

3. **Cole e execute este SQL:**
   ```sql
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
   ```

4. **Clique em RUN** (canto inferior direito)

5. **Verificar resultado:**
   ```sql
   SELECT COUNT(*) FROM "CreditBalance";
   ```

✅ **Pronto!** Agora teste o login do Google novamente no Vercel.

---

### Opção 2: Via Script Node.js com DATABASE_URL de produção

Se preferir rodar o script TypeScript:

1. **Copie a DATABASE_URL de produção:**
   - Acesse Vercel Dashboard → Seu projeto → Settings → Environment Variables
   - Copie o valor de `DATABASE_URL`

2. **Execute o script:**
   ```bash
   DATABASE_URL="[cole-aqui-a-url-de-producao]" npx tsx scripts/migrate-credit-balance.ts
   ```

---

### Opção 3: Via psql (se você tiver instalado)

```bash
# Conectar ao banco
psql "postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres"

# Executar o SQL diretamente
\i scripts/migrate-creditbalance.sql
```

---

## 🔍 Verificar se funcionou

Após executar a migração, verifique no Supabase:

```sql
-- Deve mostrar todos os seus usuários
SELECT u.email, cb."totalCredits" 
FROM "User" u
JOIN "CreditBalance" cb ON cb."userId" = u.id
ORDER BY cb."totalCredits" DESC
LIMIT 20;
```

---

## 🎯 Por que isso é necessário?

O código defensivo em `auth.ts` **só funciona durante o login bem-sucedido**. Mas se o erro acontece **antes** de chegar nessa parte do código (por exemplo, em outra query), o CreditBalance nunca é criado.

Executando essa migração SQL diretamente, você garante que **TODOS** os usuários terão CreditBalance antes mesmo de tentarem fazer login.

---

## ⚠️ Importante

Esta migration é **idempotente** (segura para executar múltiplas vezes). Ela só cria CreditBalance para usuários que **ainda não têm**, então pode rodar quantas vezes quiser sem problemas.
