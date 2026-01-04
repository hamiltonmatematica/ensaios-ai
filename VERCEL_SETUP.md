# Guia de Deploy no Vercel - Ensaios.AI

Este guia mostra como configurar as variáveis de ambiente e o Google OAuth para a versão de produção no Vercel.

---

## 🔴 Problema Identificado

O login do Google está falhando no Vercel porque:
1. ❌ Variáveis de ambiente não estão configuradas no Vercel
2. ❌ URLs de callback do Google OAuth não incluem o domínio do Vercel

---

## ✅ Solução: Configurar Vercel

### Etapa 1: Adicionar Variáveis de Ambiente no Vercel

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto `ensaios-ai`
3. Vá em **Settings** → **Environment Variables**
4. Adicione **TODAS** as seguintes variáveis (clique em **Add** para cada uma):

#### Autenticação (OBRIGATÓRIO)

| Nome da Variável | Valor | Notas |
|-----------------|-------|-------|
| `NEXTAUTH_SECRET` | `[mesma chave do .env local]` | Gerada com `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://[SEU-DOMINIO].vercel.app` | **Substitua pelo seu domínio real** |
| `GOOGLE_CLIENT_ID` | `[cliente-id].apps.googleusercontent.com` | Mesmo do .env local |
| `GOOGLE_CLIENT_SECRET` | `[cliente-secret]` | Mesmo do .env local |

#### Banco de Dados (OBRIGATÓRIO)

| Nome da Variável | Valor |
|-----------------|-------|
| `DATABASE_URL` | `postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres` |

#### Pagamentos (OBRIGATÓRIO)

| Nome da Variável | Valor |
|-----------------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` ou `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` ou `pk_live_...` |

#### APIs (OBRIGATÓRIO)

| Nome da Variável | Valor |
|-----------------|-------|
| `GEMINI_API_KEY` | `AI...` |
| `NANO_BANANA_API_KEY` | `AI...` (mesma chave do Gemini) |

**IMPORTANTE:**
- Para cada variável, selecione **Production**, **Preview** e **Development**
- Clique **Save** após adicionar todas

---

### Etapa 2: Atualizar Google OAuth URLs

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Selecione seu projeto `Ensaios AI`
3. Vá em **APIs e serviços** → **Credenciais**
4. Clique no cliente OAuth que você criou (`Ensaios.AI Web`)
5. Em **Origens JavaScript autorizadas**, clique **ADD URI** e adicione:
   ```
   https://[SEU-DOMINIO].vercel.app
   ```

6. Em **URIs de redirecionamento autorizados**, clique **ADD URI** e adicione:
   ```
   https://[SEU-DOMINIO].vercel.app/api/auth/callback/google
   ```

7. Clique **SAVE**

**EXEMPLO:**
Se seu domínio Vercel é `ensaios-ai-production.vercel.app`, adicione:
- Origem: `https://ensaios-ai-production.vercel.app`
- Callback: `https://ensaios-ai-production.vercel.app/api/auth/callback/google`

---

### Etapa 3: Redeploy no Vercel

As variáveis de ambiente só são aplicadas em novos deploys:

**Opção A: Via Dashboard**
1. Acesse seu projeto no Vercel
2. Vá em **Deployments**
3. Clique nos três pontos `...` do último deploy
4. Clique **Redeploy**
5. Confirme **Redeploy**

**Opção B: Via Git**
1. Faça qualquer commit no seu repositório:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push
   ```

**Opção C: Via CLI (se instalado)**
```bash
vercel --prod
```

---

### Etapa 4: Verificar Funcionamento

Após o redeploy (aguarde 2-3 minutos):

1. Acesse `https://[SEU-DOMINIO].vercel.app`
2. Clique em **Login**
3. Selecione **Continue with Google**
4. Faça login com sua conta Google
5. ✅ Você deve ser redirecionado de volta logado com 3 créditos

---

## 🐛 Troubleshooting

### Erro: "Cannot read properties of undefined"
**Causa:** Variável de ambiente faltando  
**Solução:** Verifique se TODAS as variáveis foram adicionadas no Vercel

### Erro: "redirect_uri_mismatch"
**Causa:** URL de callback não configurada no Google  
**Solução:** Certifique-se de adicionar a URL EXATA no Google Cloud Console

### Erro: "NEXTAUTH_URL is not set"
**Causa:** `NEXTAUTH_URL` não configurada ou com valor errado  
**Solução:** Deve ser `https://[SEU-DOMINIO].vercel.app` (sem barra no final)

### Login funciona mas não salva usuário
**Causa:** `DATABASE_URL` incorreta  
**Solução:** Verifique a connection string do Supabase

---

## 📋 Checklist Final

Antes de testar, confirme que:

- [ ] Todas as 10 variáveis de ambiente foram adicionadas no Vercel
- [ ] `NEXTAUTH_URL` aponta para o domínio correto do Vercel
- [ ] URLs foram adicionadas no Google Cloud Console
- [ ] Foi feito redeploy após adicionar as variáveis
- [ ] Aguardou 2-3 minutos após o redeploy

---

## 📚 Referências

- [Documentação NextAuth.js](https://next-auth.js.org/deployment)
- [Variáveis de Ambiente Vercel](https://vercel.com/docs/environment-variables)
- [Google OAuth Setup](https://support.google.com/cloud/answer/6158849)
