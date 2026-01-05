#!/bin/bash
# Script para migrar APIs de NextAuth para Supabase

APIS=(
  "src/app/api/face-swap/history/route.ts"
  "src/app/api/face-swap/status/[jobId]/route.ts"
  "src/app/api/upscale-image/status/[jobId]/route.ts"
  "src/app/api/credits/history/route.ts"
  "src/app/api/stripe/checkout/route.ts"
  "src/app/api/support/route.ts"
  "src/app/api/proxy-image/route.ts"
)

for file in "${APIS[@]}"; do
  if [ -f "$file" ]; then
    echo "Migrando: $file"
    
    # Substituir imports
    sed -i '' 's/import { getServerSession } from "next-auth"/import { createClient } from "@\/lib\/supabase-server"/g' "$file"
    sed -i '' '/import { authOptions }/d' "$file"
    
    # Substituir getServerSession
    sed -i '' 's/const session = await getServerSession(authOptions)/const supabase = await createClient()\n        const { data: { user }, error: authError } = await supabase.auth.getUser()/g' "$file"
    
    # Substituir verificações de sessão
    sed -i '' 's/if (!session?.user?.id)/if (authError || !user?.email)/g' "$file"
    sed -i '' 's/if (!session || !session.user?.email)/if (authError || !user?.email)/g' "$file"
    
    # Substituir session.user.id por dbUser.id após busca
    sed -i '' 's/userId: session.user.id/userId: dbUser.id/g' "$file"
    
    echo "✅ Migrado: $file"
  else
    echo "⚠️  Arquivo não encontrado: $file"
  fi
done

echo ""
echo "🎉 Migração concluída!"
echo "⚠️  IMPORTANTE: Revisar manualmente cada arquivo para garantir que a lógica está correta"
