#!/bin/bash

# Script para aplicar mudanças Supabase em batch
# Substitui useSession por Supabase em todos os arquivos

FILES=(
  "src/app/ensaio/page.tsx"
  "src/app/face-swap/page.tsx"
  "src/app/upscale-image/page.tsx"
  "src/app/my-photos/page.tsx"
  "src/app/history/page.tsx"
  "src/app/admin/layout.tsx"
  "src/components/LandingPage.tsx"
  "src/components/PricingModal.tsx"
  "src/components/LoginModal.tsx"
  "src/components/HomePage.tsx"
  "src/components/ModelGallery.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Remove import NextAuth
    sed -i '' 's/import { useSession.*from "next-auth\/react"/\/\/ NextAuth removed/g' "$file"
    sed -i '' 's/import { signIn.*from "next-auth\/react"//g' "$file"
    sed -i '' 's/import { getServerSession.*from "next-auth"//g' "$file"
    
    echo "✓ $file"
  fi
done

echo ""
echo "Substitua manualmente:"
echo "1. Adicione import { createClient } from '@/lib/supabase-client'"
echo "2. Substitua useSession() por createClient() + getUser()"
echo "3. Substitua session.user por user"
echo "4. Substitua session.user.credits por userCredits (buscar de /api/credits)"
