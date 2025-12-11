# Guia de Configuração - Ensaios.AI

Siga este guia na ordem para configurar todos os serviços necessários.

---

## 1. Criar arquivo .env

Primeiro, crie o arquivo `.env` na raiz do projeto:

```bash
# Execute no terminal:
cp ENV_TEMPLATE.txt .env
```

Agora vamos preencher cada variável.

---

## 2. Supabase (Banco de Dados)

### Passo 1: Criar conta e projeto
1. Acesse [supabase.com](https://supabase.com)
2. Clique em **Start your project**
3. Faça login com GitHub
4. Clique em **New Project**
5. Preencha:
   - **Name:** `ensaios-ai`
   - **Database Password:** (anote esta senha!)
   - **Region:** `South America (São Paulo)`
6. Clique **Create new project** e aguarde ~2 min

### Passo 2: Copiar DATABASE_URL
1. No painel, vá em **Settings** → **Database**
2. Role até **Connection string** → **URI**
3. Clique em **Copy**
4. Cole no `.env`:
```
DATABASE_URL="postgresql://postgres:[SUA-SENHA]@db.[PROJETO].supabase.co:5432/postgres"
```

### Passo 3: Criar tabelas
Execute no terminal:
```bash
npx prisma db push
```

---

## 3. NextAuth Secret

Gere uma chave secreta:
```bash
openssl rand -base64 32
```

Cole no `.env`:
```
NEXTAUTH_SECRET="[RESULTADO-DO-COMANDO]"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 4. Google OAuth (Login)

### Passo 1: Criar projeto Google Cloud
1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Clique no seletor de projetos → **Novo Projeto**
3. Nome: `Ensaios AI` → **Criar**

### Passo 2: Configurar tela de consentimento
1. Menu → **APIs e serviços** → **Tela de consentimento OAuth**
2. Selecione **Externo** → **Criar**
3. Preencha:
   - Nome do app: `Ensaios.AI`
   - Email de suporte: seu email
   - Email do desenvolvedor: seu email
4. Clique **Salvar e continuar** (3x até finalizar)

### Passo 3: Criar credenciais
1. Menu → **APIs e serviços** → **Credenciais**
2. **Criar credenciais** → **ID do cliente OAuth**
3. Tipo: **Aplicativo Web**
4. Nome: `Ensaios.AI Web`
5. **Origens JavaScript autorizadas:**
   - `http://localhost:3000`
6. **URIs de redirecionamento autorizados:**
   - `http://localhost:3000/api/auth/callback/google`
7. Clique **Criar**

### Passo 4: Copiar credenciais
Cole no `.env`:
```
GOOGLE_CLIENT_ID="[CLIENT-ID].apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="[CLIENT-SECRET]"
```

---

## 5. Stripe (Pagamentos)

### Passo 1: Criar conta
1. Acesse [stripe.com](https://stripe.com)
2. Clique **Começar agora** e crie sua conta

### Passo 2: Copiar chaves (Modo Teste)
1. No Dashboard, clique em **Desenvolvedores** → **Chaves de API**
2. Copie as chaves de **teste**:
```
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Passo 3: Configurar Webhook
1. Vá em **Desenvolvedores** → **Webhooks**
2. Clique **Adicionar endpoint**
3. URL: `https://seu-dominio.com/api/stripe/webhook`
   - Para teste local, use [Stripe CLI](https://stripe.com/docs/stripe-cli)
4. Eventos: selecione `checkout.session.completed`
5. Copie o **Signing secret**:
```
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## 6. API Gemini (Geração de Imagens)

### Passo 1: Obter API Key
1. Acesse [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Clique **Create API key**
3. Selecione seu projeto ou crie um novo
4. Copie a chave

Cole no `.env`:
```
GEMINI_API_KEY="AI..."
NANO_BANANA_API_KEY="AI..."  # mesma chave
```

---

## 7. Verificar Configuração

Após preencher tudo, reinicie o servidor:
```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

Acesse http://localhost:3000 e teste:
1. Clique em **Login** → deve abrir tela do Google
2. Após login, você terá 3 créditos
3. Teste upload de fotos

---

## Arquivo .env Final

```env
# Supabase
DATABASE_URL="postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_SECRET="sua-chave-gerada"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# Stripe
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"

# Gemini API
GEMINI_API_KEY="AIxxx"
NANO_BANANA_API_KEY="AIxxx"
```
