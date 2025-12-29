# Ensaios.AI - Documentação da Plataforma

## Visão Geral
**Ensaios.AI** é uma plataforma SaaS de IA generativa focada em criação e manipulação de imagens. A plataforma oferece duas funcionalidades principais: Ensaio de IA e Face Swap, ambas utilizando créditos como sistema de pagamento unificado.

**URL:** ensaios.ai  
**Framework:** Next.js 16 (App Router) com TypeScript  
**Banco de Dados:** PostgreSQL (via Supabase)  
**ORM:** Prisma  
**Autenticação:** NextAuth.js (Google OAuth)  
**Pagamentos:** Stripe  
**Hospedagem:** Vercel (presumido)

---

## Stack Tecnológica

### Frontend
- **Next.js 16** com App Router
- **React 18** com hooks
- **TypeScript**
- **Tailwind CSS** (design dark mode, tons de zinc, gradientes amarelo/laranja)
- **Lucide React** (ícones)

### Backend
- **Next.js API Routes** (App Router)
- **Prisma** para banco de dados
- **NextAuth.js** para autenticação
- **Stripe** para pagamentos

### APIs Externas
- **Nano Banana API** - Ensaios de IA (geração de imagens)
- **RunPod API** - Face Swap (modelo Inswapper 128)
  - Endpoint: `https://api.runpod.ai/v2/{ENDPOINT_ID}/run`
  - Modelo: Face Swap 5.2.0

### Infraestrutura
- **Supabase** - Banco PostgreSQL + Storage
- **Stripe** - Pagamentos
- **Google OAuth** - Login social

---

## Modelos de Dados (Prisma)

### User
```prisma
model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String?
  image         String?
  password      String?
  emailVerified DateTime?
  credits       Int           @default(3)  // Créditos iniciais grátis
  role          Role          @default(USER)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  accounts        Account[]
  sessions        Session[]
  generations     Generation[]
  transactions    Transaction[]
  supportMessages SupportMessage[]
  faceSwapJobs    FaceSwapJob[]
}
```

### FaceSwapJob
```prisma
model FaceSwapJob {
  id            String   @id @default(cuid())
  userId        String
  jobId         String?  // ID do RunPod
  status        String   // PENDING, IN_PROGRESS, COMPLETED, FAILED
  sourceImage   String?  @db.Text
  targetImage   String?  @db.Text
  resultImage   String?  @db.Text
  errorMessage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Generation (Ensaio de IA)
```prisma
model Generation {
  id          String   @id @default(cuid())
  userId      String
  modelId     String?
  prompt      String?
  status      String   // pending, completed, failed
  aspectRatio String?
  resultUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  model PhotoModel? @relation(fields: [modelId], references: [id])
}
```

---

## Funcionalidades

### 1. Ensaio de IA (`/ensaio`)
- Upload de 3 fotos do usuário
- Seleção de modelo/estilo de ensaio
- Geração via API Nano Banana
- Custo: 1 crédito por geração
- Galeria de resultados em "Meus Ensaios"

### 2. Face Swap (`/face-swap`)
- Upload de 2 imagens:
  - **Fonte:** Rosto para copiar (selfie frontal ideal)
  - **Alvo:** Imagem onde aplicar o rosto
- Processamento via RunPod API
- Polling de status até conclusão
- Download e compartilhamento do resultado
- Histórico dos últimos 10 swaps
- Custo: 1 crédito por swap

### 3. Dashboard (`/dashboard`)
- Tela inicial pós-login
- Cards de acesso rápido aos serviços
- Exibição de créditos do usuário
- Estatísticas de uso

### 4. Landing Page (`/`)
- Apresentação para visitantes não logados
- Hero section com CTA
- Features dos serviços
- Seção "Como funciona"
- Redirecionamento automático para dashboard se logado

### 5. Sistema de Créditos
- 3 créditos grátis ao cadastrar
- Unificado para todos os serviços
- Compra via Stripe
- Pacotes configuráveis

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── api/
│   │   ├── face-swap/
│   │   │   ├── route.ts           # POST - inicia job
│   │   │   ├── status/[jobId]/route.ts  # GET - polling
│   │   │   └── history/route.ts   # GET - histórico
│   │   ├── generate/route.ts      # Ensaio de IA
│   │   ├── stripe/                # Pagamentos
│   │   └── admin/                 # APIs admin
│   ├── dashboard/page.tsx
│   ├── ensaio/page.tsx
│   ├── face-swap/page.tsx
│   ├── my-photos/page.tsx
│   ├── admin/                     # Painel admin
│   └── page.tsx                   # Landing/redirect
├── components/
│   ├── Header.tsx                 # Navegação + créditos
│   ├── HomePage.tsx               # Funcionalidade Ensaio
│   ├── LandingPage.tsx            # Página inicial
│   ├── DashboardCard.tsx          # Cards do dashboard
│   ├── PricingModal.tsx           # Modal de compra
│   └── LoginModal.tsx             # Modal de login
├── lib/
│   ├── prisma.ts                  # Cliente Prisma
│   ├── auth.ts                    # Configuração NextAuth
│   └── stripe.ts                  # Configuração Stripe
└── styles/
    └── globals.css
```

---

## Variáveis de Ambiente (.env)

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Stripe
STRIPE_SECRET_KEY="..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="..."
STRIPE_WEBHOOK_SECRET="..."

# APIs de IA
NANO_BANANA_API_KEY="..."
RUNPOD_API_KEY="..."
RUNPOD_ENDPOINT_ID="h9fyw7xb7dagyu"

# Opcional
GEMINI_API_KEY="..."
```

---

## Design System

### Cores
- **Background:** zinc-950 (muito escuro)
- **Cards:** zinc-900 com border zinc-800
- **Accent primário:** yellow-500 / orange-500 (gradiente)
- **Accent secundário:** pink-500 / purple-500 (Face Swap)
- **Textos:** white, zinc-300, zinc-400, zinc-500
- **Sucesso:** green-500
- **Erro:** red-500
- **Info:** blue-500

### Tipografia
- Font: System (sans-serif)
- Títulos: font-bold com gradientes
- Corpo: text-sm a text-base

### Componentes
- Botões: rounded-xl ou rounded-full
- Cards: rounded-2xl com border e shadow
- Inputs: rounded-xl com border-2 dashed
- Modais: backdrop-blur com bg-black/80

---

## Fluxo de Autenticação

1. Usuário acessa `/`
2. Se não logado → Landing Page com CTA "Entrar"
3. Clica em Entrar → LoginModal abre
4. Login via Google OAuth
5. Redirecionamento para `/dashboard`
6. Header mostra créditos e menu

---

## Fluxo de Face Swap

1. Usuário em `/face-swap`
2. Upload foto fonte (rosto para copiar)
3. Upload foto alvo (onde aplicar)
4. Clica "Processar"
5. API verifica créditos
6. Cria FaceSwapJob no banco
7. Envia para RunPod API
8. Frontend faz polling `/status/{jobId}`
9. Quando COMPLETED:
   - Salva resultado no banco
   - Deduz 1 crédito
   - Exibe resultado
10. Opções: Download, Compartilhar, Novo

---

## Administração (`/admin`)

- `/admin` - Dashboard admin
- `/admin/users` - Gestão de usuários
- `/admin/models` - Modelos de ensaio
- `/admin/tags` - Tags/categorias
- Acesso restrito por role: ADMIN

---

## Integrações Futuras Possíveis

- Mais modelos de IA (DALL-E, Midjourney)
- Geração de vídeo
- Remoção de fundo
- Upscale de imagens
- API pública para terceiros
- Planos de assinatura (além de créditos)

---

## Contato e Suporte

- Rota: `/support`
- Modelo: SupportMessage
- Sistema de tickets básico

---

*Documentação gerada em 29/12/2025*
