# Google Ads — como pegar as credenciais (passo a passo)

Guia manual para obter tudo que a integração Google Ads do meugestor vai precisar. Não envolve escrever código — é só clicar nas telas do Google. Quando terminar, preencha os valores direto na tela do meugestor (botão **"Google Ads"** no topo do dashboard, ao lado do botão de token da Meta) — igual você já faz hoje com o token da Meta.

Veja também [GOOGLE_ADS_INTEGRATION.md](GOOGLE_ADS_INTEGRATION.md) para o roadmap técnico de como o código vai usar essas credenciais.

## 1) Google Cloud — criar as credenciais OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie um projeto novo (ou use um existente).
2. Menu **APIs e Serviços → Biblioteca** → procure **"Google Ads API"** → clique **Ativar**.
3. Menu **APIs e Serviços → Tela de consentimento OAuth**:
   - Tipo: **Externo**.
   - Preencha nome do app, e-mail de suporte, e-mail do desenvolvedor.
   - Em "Escopos", não precisa adicionar nada agora.
   - Em "Usuários de teste", adicione o **seu próprio e-mail Google** (o mesmo que acessa o MCC). Enquanto o app estiver em modo "Testing", só esses e-mails conseguem autorizar.
4. Menu **APIs e Serviços → Credenciais → Criar Credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Em "URIs de redirecionamento autorizados", adicione: `https://developers.google.com/oauthplayground`
   - Salve e copie o **Client ID** e o **Client Secret** → vão em `GOOGLE_ADS_CLIENT_ID` e `GOOGLE_ADS_CLIENT_SECRET`.

## 2) MCC — pedir o Developer Token

1. Entre no [Google Ads](https://ads.google.com) com a conta que administra o MCC.
2. Vá em **Ferramentas e configurações (ícone de chave inglesa) → Configuração → API Center**.
3. Copie o **Developer Token** que aparece lá → vai em `GOOGLE_ADS_DEVELOPER_TOKEN`. Nasce em nível **Test**, funciona só com contas de teste do Ads por enquanto.
4. Nessa mesma tela tem um link/formulário para solicitar acesso **Basic** (contas reais) — preencha e envie. É o item mais demorado (dias a semanas), então vale pedir agora e seguir usando conta de teste enquanto espera.

## 3) Pegar o Refresh Token

Use o **OAuth Playground do Google** — ferramenta oficial feita exatamente pra isso, sem precisar escrever código:

1. Acesse [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Clique no ícone de engrenagem (⚙️) no canto superior direito → marque **"Use your own OAuth credentials"** → cole o Client ID e Client Secret do passo 1.
3. Na coluna da esquerda, no campo "Input your own scopes", cole: `https://www.googleapis.com/auth/adwords` → clique **Authorize APIs**.
4. Faça login com a conta Google que tem acesso ao MCC e aceite a permissão.
5. De volta no Playground, clique **Exchange authorization code for tokens**.
6. Copie o **Refresh token** (string longa começando com `1//`) → vai em `GOOGLE_ADS_REFRESH_TOKEN`. Não expira até você revogar o acesso — é o token que o app vai usar pra sempre gerar novos access tokens sozinho.

## 4) Achar os IDs de conta

- **Login Customer ID**: o ID do seu MCC (aparece no canto superior direito do Google Ads quando logado nele), formato `123-456-7890` — remova os traços → vai em `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.
- **Customer ID**: o ID da conta de anúncios específica que você quer gerenciar (mesma lógica, sem traços) → vai em `GOOGLE_ADS_CUSTOMER_ID`.

## Onde colocar

No meugestor (já publicado), clique no botão **"Google Ads"** no topo do dashboard. Abre um modal com 6 campos:

- Client ID
- Client Secret
- Developer Token
- Refresh Token
- Login Customer ID (MCC)
- Customer ID (conta a gerenciar)

Preenche e clica em **Salvar**. Fica guardado no localStorage do seu navegador (mesmo mecanismo do token da Meta hoje) e é enviado automaticamente nas chamadas à API assim que o backend do Google Ads existir. Nada disso deve ser colado no chat.

**Nota de segurança**: diferente do token da Meta (que só dá acesso a uma conta de anúncios), o Client Secret e o Developer Token são credenciais mais "de sistema" — dão acesso amplo ao seu app Google Cloud e à API do Google Ads como um todo. Guardá-los no navegador é mais exposto a risco (ex.: XSS) do que mantê-los só no servidor. Foi uma escolha consciente pra manter a mesma UX do token da Meta; se um dia quiser reforçar a segurança, dá pra mover Client ID/Secret/Developer Token pro `.env` do servidor e deixar só o Refresh Token + Customer IDs no navegador.

Quando estiver tudo preenchido, é só avisar que eu escrevo o `src/lib/google-ads.ts` (Fase 2 do roadmap) espelhando o `src/lib/facebook.ts` que já existe, lendo essas credenciais dos headers (`x-google-ads-*`) que o frontend já está enviando, pra você ver os dados do Google Ads no mesmo dashboard do meugestor.
