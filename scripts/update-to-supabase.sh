#!/bin/bash

# Script para substituir padrões NextAuth por Supabase em arquivos TypeScript/TSX

files=(
    "src/app/ensaio/page.tsx"
    "src/app/face-swap/page.tsx"
    "src/app/upscale-image/page.tsx"
    "src/app/my-photos/page.tsx"
    "src/components/HomePage.tsx"
    "src/components/ModelGallery.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Atualizando $file..."
        
        # Remover import useSession e signIn
        sed -i '' 's/import { useSession } from "next-auth\/react"/\/\/ NextAuth removido/g' "$file"
        sed -i '' 's/import { useSession, signIn } from "next-auth\/react"/\/\/ NextAuth removido/g' "$file"
        
        echo "✓ $file atualizado"
    else
        echo "⚠ $file não encontrado"
    fi
done

echo "✅ Concluído!"
