# Processo de Construção de Base de Login

## 📋 Visão Geral

Este documento descreve a implementação completa de um sistema de autenticação usando **Next.js 15+** e **Supabase**, incluindo:

- Login com email/senha
- Login com link mágico
- Recuperação de senha
- Confirmação de email com cadastro de senha pelo usuário
- Alteração de email
- Controle de sessão (limite de dispositivos)

---

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 15+ (App Router)
- **Backend:** Supabase (Auth, Database, Storage)
- **Linguagem:** TypeScript

---

## 📁 Estrutura de Arquivos Necessária

```
src/
├── app/
│   ├── login/page.tsx                    # Página de login principal
│   ├── recuperar-senha/page.tsx          # Solicitar recuperação de senha
│   ├── redefinir-senha/page.tsx          # Definir nova senha
│   ├── email-confirmado/page.tsx         # Confirmação de email + cadastro de senha
│   ├── auth/
│   │   └── callback/route.ts             # Callback para processar tokens
│   └── api/
│       └── session/route.ts              # API de controle de sessão
├── components/
│   ├── LayoutWrapper.tsx                 # Wrapper que controla exibição de sidebar
│   └── AuthHandler.tsx                   # Handler de autenticação
├── lib/
│   ├── supabase.ts                       # Cliente Supabase (browser)
│   └── supabase-server.ts                # Cliente Supabase (server)
└── middleware.ts                         # Middleware de proteção de rotas
```

---

## 🔐 1. Middleware de Proteção de Rotas

**Arquivo:** `src/middleware.ts`

O middleware intercepta todas as requisições e redireciona para `/login` se o usuário não estiver autenticado.

**CRÍTICO - Rotas Públicas:**
```typescript
const publicRoutes = [
    '/login',
    '/recuperar-senha',
    '/redefinir-senha',
    '/email-confirmado',
    '/auth/callback',
    '/admin/login'
]
```

> ⚠️ **Todas as rotas relacionadas a autenticação devem estar nesta lista**, caso contrário serão redirecionadas para `/login`.

---

## 🔑 2. Página de Login

**Arquivo:** `src/app/login/page.tsx`

### Funcionalidades:
- Login com email/senha
- Link "Esqueceu a senha?" → `/recuperar-senha`
- Botão "Login sem senha" (magic link)
- Controle de sessão (limite de dispositivos)

### Fluxo de Controle de Sessão:
1. Após login bem-sucedido, chama `/api/session` com `action: 'create'`
2. Se retornar 403, mostra modal de "Limite de dispositivos"
3. Usuário pode desconectar sessão antiga e continuar

---

## 📧 3. Auth Callback

**Arquivo:** `src/app/auth/callback/route.ts`

Processa tokens vindos de emails (confirmação, recuperação, magic link).

```typescript
// Tipos suportados
type: 'recovery' | 'email' | 'magiclink' | 'signup' | 'email_change'
```

### Redirecionamentos:
| Type | Destino |
|------|---------|
| `recovery` | `/redefinir-senha` |
| `signup` ou `email` | `/email-confirmado` |
| `email_change` | `/` (home) |
| `magiclink` | `/` (home) |

---

## 🔄 4. Recuperação de Senha

### Página de Solicitação
**Arquivo:** `src/app/recuperar-senha/page.tsx`

```typescript
await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
});
```

### Página de Redefinição
**Arquivo:** `src/app/redefinir-senha/page.tsx`

- Recebe token via callback
- Permite definir nova senha
- Usa `supabase.auth.updateUser({ password })`

---

## ✅ 5. Confirmação de Email com Cadastro de Senha

**Arquivo:** `src/app/email-confirmado/page.tsx`

### Fluxo:
1. Admin cadastra usuário (com senha temporária)
2. Usuário recebe email de confirmação
3. Clica no link → vai para `/email-confirmado`
4. Página verifica o token com `supabase.auth.verifyOtp()`
5. Mostra formulário para definir senha própria
6. Usa `supabase.auth.updateUser({ password })`

### Estados da Página:
- `loading` → Verificando token
- `setPassword` → Token válido, mostrar formulário
- `success` → Senha definida, botão "Acessar Plataforma"
- `error` → Token inválido/expirado

> ⚠️ **Usar `<Suspense>` wrapper para `useSearchParams()`** - exigido pelo Next.js 15+

---

## 🔗 6. Templates de Email no Supabase

### Confirm Sign Up (Confirmação de Cadastro)
```html
Subject: Confirme seu cadastro

<h2>Bem-vindo!</h2>
<p>Olá,</p>
<p>Seu cadastro foi feito. Clique abaixo para confirmar seu email e criar sua senha:</p>
<p><a href="{{ .SiteURL }}/email-confirmado?token_hash={{ .TokenHash }}&type=email" 
   style="background: #c9a227; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
   Confirmar Email e Criar Senha
</a></p>
```

### Reset Password (Recuperar Senha)
```html
Subject: Redefinir sua senha

<h2>🔐 Redefinição de Senha</h2>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery" 
   style="background: #c9a227; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
   Redefinir Minha Senha
</a></p>
```

### Magic Link (Login sem Senha)
```html
Subject: Seu link de acesso

<p><a href="{{ .ConfirmationURL }}" 
   style="background: #c9a227; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
   Acessar Minha Conta
</a></p>
```

### Change Email (Alteração de Email)
```html
Subject: Confirme a alteração de email

<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/" 
   style="background: #c9a227; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
   Confirmar Alteração
</a></p>
```

> ⚠️ **NUNCA use `{{ .ConfirmationURL }}` para confirmação de cadastro ou recuperação** - use URL customizada.

---

## 🔒 7. Controle de Sessão

**Arquivo:** `src/app/api/session/route.ts`

### Configuração:
```typescript
const MAX_DEVICES = 1;      // Limite de dispositivos simultâneos
const SESSION_HOURS = 8;    // Tempo de expiração da sessão
```

### Tabela no Supabase:
```sql
CREATE TABLE public.ap_user_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_info text,
    ip_address text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ap_user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_all_service" ON public.ap_user_sessions
    FOR ALL USING (true) WITH CHECK (true);
```

### Actions da API:
| Action | Descrição |
|--------|-----------|
| `create` | Cria nova sessão (verifica limite) |
| `validate` | Valida se sessão ainda é válida |
| `delete` | Remove sessão atual |
| `deleteOther` | Remove outra sessão (para liberar slot) |
| `list` | Lista sessões ativas do usuário |

---

## ⚙️ 8. Configuração do Supabase

### URL Configuration
- **Site URL:** URL de produção (ex: `https://meusite.vercel.app`)
- **Redirect URLs:** `http://localhost:3000/**` e `https://meusite.vercel.app/**`

### Variáveis de Ambiente
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 🚨 Problemas Comuns e Soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| Link vai para `/login` | Rota não está em `publicRoutes` | Adicionar ao middleware |
| `useSearchParams()` error | Next.js 15+ exige Suspense | Envolver com `<Suspense>` |
| Email não chega | Rate limit (60s) ou usuário não existe | Aguardar e tentar novamente |
| Token inválido | Uso único ou expirado (1h) | Solicitar novo email |

---

## 📝 Checklist de Implementação

- [ ] Criar cliente Supabase (browser e server)
- [ ] Configurar middleware com rotas públicas
- [ ] Criar página de login
- [ ] Criar página de recuperação de senha
- [ ] Criar página de redefinição de senha
- [ ] Criar página de confirmação de email
- [ ] Criar auth callback
- [ ] Criar API de sessão (se usar controle de dispositivos)
- [ ] Configurar templates de email no Supabase
- [ ] Configurar Site URL e Redirect URLs no Supabase
- [ ] Testar todos os fluxos

---

## 🎯 Resumo Rápido

| Fluxo | URL Template Email | Destino Final |
|-------|-------------------|---------------|
| Confirmar Cadastro | `{{ .SiteURL }}/email-confirmado?token_hash={{ .TokenHash }}&type=email` | `/email-confirmado` |
| Recuperar Senha | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery` | `/redefinir-senha` |
| Magic Link | `{{ .ConfirmationURL }}` | `/` (home) |
| Alterar Email | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change` | `/` (home) |

---

*Documento criado em: Dezembro 2025*
