#!/bin/bash

# Script para migrar automaticamente arquivos de NextAuth para Supabase
# Aplica padrão de substituição comum

files=(
    "src/app/api/credits/history/route.ts"
    "src/app/api/user/route.ts"
    "src/app/api/support/route.ts"
    "src/app/api/face-swap/history/route.ts"
    "src/app/api/proxy-image/route.ts"
    "src/app/api/upscale-image/status/[jobId]/route.ts"
    "src/app/api/face-swap/status/[jobId]/route.ts"
    "src/app/api/stripe/checkout/route.ts"
    "src/app/api/admin/support/route.ts"
    "src/app/api/admin/tags/route.ts"
    "src/app/api/admin/history/route.ts"
    "src/app/api/admin/users/route.ts"
    "src/app/api/admin/models/route.ts"
    "src/app/api/admin/upload/route.ts"
)

echo "🚀 Iniciando migração automática de NextAuth → Supabase"
echo ""

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "📝 Migrando: $file"
        
        # 1. Substituir imports
        sed -i '' 's/import { getServerSession } from "next-auth"/import { createClient } from "@\/lib\/supabase-server"/g' "$file"
        sed -i '' '/import { authOptions } from "@\/lib\/auth"/d' "$file"
        
        # 2. Adicionar import do prisma se não existir
        if ! grep -q 'import { prisma }' "$file"; then
            sed -i '' '1a\
import { prisma } from "@/lib/prisma"
' "$file"
        fi
        
        echo "   ✓ Imports atualizados"
    else
        echo "   ⚠️  Arquivo não encontrado: $file"
    fi
done

echo ""
echo "✅ Migração de imports concluída!"
echo "⚠️  ATENÇÃO: Você ainda precisa atualizar manualmente:"
echo "   - Substituir getServerSession(authOptions) por createClient() + auth.getUser()"
echo "   - Adicionar lookup de usuário por email no Prisma"
echo "   - Substituir session.user.id por dbUser.id"
