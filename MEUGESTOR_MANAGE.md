# meugestor — Camada de Gerenciamento (Meta Ads)

Camada de escrita do meugestor: criação, duplicação, edição e automação de campanhas direto do dashboard. Tudo roda sobre a Graph API da Meta via rotas `/api/meugestor/manage/*` (server-side, token nunca vai ao browser).

## Funcionalidades

### Assistente de criação (wizard)
Fluxo em 3 passos: **Campanha → Conjunto → Anúncio**.

- **Tudo é criado PAUSADO por padrão.** Nada entra no ar sem ativação explícita (`status: "ACTIVE"` só quando você pedir).
- **Botão Validar**: envia a mesma requisição com `execution_options: ["validate_only"]` na Graph API. A Meta valida o payload (objetivo, segmentação, orçamento, criativo) sem criar nada nem gastar nada.
- Ativos da conta (pixels, páginas, criativos recentes) são carregados via `/manage/assets` para preencher o wizard.
- Busca de segmentação (interesses e localizações) via `/manage/search`; estimativa de alcance via `/manage/estimate`.

### Públicos (audiences)
- **Lista de clientes**: envio de emails/telefones — o **hash SHA-256 é feito no servidor** (obrigatório pela Meta; dados nunca saem em texto puro). Máx. 100.000 registros por requisição.
- **Lookalike**: a partir de um público de origem + país + ratio (1% a 20%).
- **Termos de Públicos Personalizados**: se a conta ainda não aceitou os termos, a API retorna 403 com o link de aceite:
  `https://business.facebook.com/ads/manage/customaudiences/tos/?act=<ACCOUNT_ID>`
  Basta abrir, aceitar e repetir a operação.

### Duplicar (via `/copies` da Graph API)
Duplica campanha, conjunto ou anúncio. `deep: true` copia também os filhos (ex.: campanha com conjuntos e anúncios). Cópia nasce **pausada**.

### Edição rápida
Nome, orçamento (diário ou total) e status de qualquer campanha/conjunto/anúncio, sem sair do dashboard.

### Regras automatizadas (beta)
Baseadas na `adrules_library` da Meta. Três templates prontos, todos com ação **PAUSAR** e avaliação a cada 30 min:

| Template | Condição |
|---|---|
| `pause_no_results` | gastou mais que X centavos e teve < 1 resultado |
| `pause_high_cpa` | custo por resultado acima de X centavos |
| `pause_high_spend` | gasto acima de X centavos no período |

## Endpoints (`/api/meugestor/manage/*`)

Todas as respostas seguem `{ success: boolean, data | error }`. `accountId` aceita com ou sem prefixo `act_`.

### POST `/api/meugestor/manage/campaigns`
```json
{
  "accountId": "act_123456789",
  "validateOnly": true,
  "campaign": {
    "name": "Campanha Leads Julho",
    "objective": "OUTCOME_LEADS",
    "status": "PAUSED",
    "specialAdCategories": [],
    "dailyBudgetCents": 5000
  }
}
```
Objetivos válidos: `OUTCOME_TRAFFIC`, `OUTCOME_LEADS`, `OUTCOME_SALES`, `OUTCOME_ENGAGEMENT`, `OUTCOME_AWARENESS`, `OUTCOME_APP_PROMOTION`.

### POST `/api/meugestor/manage/adsets`
```json
{
  "accountId": "123456789",
  "validateOnly": false,
  "adset": {
    "name": "Conjunto BR 25-45",
    "campaignId": "1200...",
    "optimizationGoal": "LEAD_GENERATION",
    "dailyBudgetCents": 3000,
    "targeting": {
      "geo_locations": { "countries": ["BR"] },
      "age_min": 25,
      "age_max": 45
    }
  }
}
```
Regra: `lifetimeBudgetCents` exige `endTime`.

### POST `/api/meugestor/manage/ads`
```json
{
  "accountId": "123456789",
  "validateOnly": false,
  "imageBase64": "(opcional — upload de imagem nova)",
  "imageName": "banner.jpg",
  "ad": {
    "name": "Anúncio 01",
    "adsetId": "1200...",
    "creative": {
      "pageId": "9876...",
      "link": "https://exemplo.com/oferta",
      "message": "Texto principal do anúncio"
    }
  }
}
```
Caminhos de criativo aceitos (um deles é obrigatório): `existingCreativeId` (reusar criativo), `objectStoryId` (impulsionar publicação) ou `pageId` + `link` (criativo novo; `imageBase64` gera o `imageHash` automaticamente).

### GET `/api/meugestor/manage/assets?accountId=act_123`
Retorna `{ pixels, pages, creatives }` da conta (busca em paralelo, tolerante a falha parcial).

### GET `/api/meugestor/manage/search?type=interest|geo&q=fitness&country=BR`
Busca de interesses (`adinterest`) e localizações (`adgeolocation`). `q` mínimo 2 caracteres.

### POST `/api/meugestor/manage/estimate`
```json
{ "accountId": "123", "optimizationGoal": "LEAD_GENERATION", "targeting": { "geo_locations": { "countries": ["BR"] } } }
```
Retorna `delivery_estimate` (alcance estimado) para a segmentação.

### GET `/api/meugestor/manage/audiences?accountId=act_123`
Lista públicos personalizados da conta.

### POST `/api/meugestor/manage/audiences`
```json
{ "accountId": "123", "kind": "list", "name": "Clientes 2026", "description": "Base CRM" }
```
```json
{ "accountId": "123", "kind": "lookalike", "originAudienceId": "2384...", "country": "BR", "ratio": 0.03 }
```
`ratio`: 0.01 a 0.2 (1% a 20%). Se a conta não aceitou os Termos, retorna 403 com `tosUrl`.

### POST `/api/meugestor/manage/audiences/:id/users`
```json
{ "emails": ["a@b.com", "c@d.com"], "phones": ["+5511999998888"] }
```
Hash SHA-256 aplicado no servidor. Máx. 100.000 registros por chamada.

### POST `/api/meugestor/manage/copy`
```json
{ "id": "1200...", "kind": "campaign", "deep": true, "suffix": " (cópia)" }
```
`kind`: `campaign` | `adset` | `ad`. Usa o endpoint `/copies` da Graph API.

### POST `/api/meugestor/manage/update`
```json
{ "id": "1200...", "fields": { "dailyBudgetCents": 8000, "status": "ACTIVE" } }
```
Campos aceitos: `name`, `dailyBudgetCents`, `lifetimeBudgetCents`, `status` (`ACTIVE` | `PAUSED` | `ARCHIVED` | `DELETED`). Ao menos um é obrigatório.

### GET/POST/DELETE `/api/meugestor/manage/rules`
```json
{
  "accountId": "123",
  "rule": {
    "name": "Pausar CPA alto",
    "template": "pause_high_cpa",
    "entityType": "ADSET",
    "params": { "cpaCents": 2500, "days": 3 }
  }
}
```
`params.spendCents` obrigatório para `pause_no_results` e `pause_high_spend`; `params.cpaCents` para `pause_high_cpa`. `days` (1, 3 ou 7) define o período avaliado. DELETE: `?ruleId=...`.

## Escopos do token

Token atual: `read_insights`, `ads_management`, `ads_read`, `public_profile`.

- **Suficiente para tudo acima**: criação, duplicação, edição, públicos, regras e insights.
- **Limitação conhecida**: listar as páginas do usuário (`/me/accounts`) exigiria o escopo `pages_show_list`, que o token não tem. O wizard contorna isso de duas formas:
  1. Deriva as páginas a partir dos criativos existentes da conta (`/manage/assets`).
  2. Aceita entrada manual do ID da página.

## Segurança: política de token nas rotas

- **Leituras** (dashboards, insights, listagens): aceitam o token do modal (header `x-meta-access-token`) **ou** o `META_ACCESS_TOKEN` do `.env` como fallback.
- **Escritas** (criar, duplicar, editar, pausar/ativar, públicos, regras): exigem o token **explícito via modal Token** — não há fallback para o `.env`. Motivo: num deploy público, o fallback permitiria a qualquer pessoa na internet criar campanhas e gastar com o token do servidor. O guard (`src/lib/meugestor-write-guard.ts`) também bloqueia requisições cross-site (anti-CSRF por origem + Content-Type JSON) e valida ids numéricos do Graph.
- Na prática: ao usar o meugestor para **gerenciar** (não só ver), cole o token uma vez no botão **Token Meta** — ele fica salvo no navegador.

## Boas práticas

1. **Sempre validar antes de criar**: use o botão Validar (`validateOnly: true`) — a Meta aponta erro de segmentação/orçamento/criativo sem criar nada.
2. **Orçamento em centavos**: a API da Meta usa a menor unidade da moeda. R$ 50,00 = `5000`. Sempre inteiro positivo.
3. **Tudo nasce pausado**: revise no Gerenciador de Anúncios ou no próprio meugestor antes de ativar.
4. **Validade do token**: o token atual **expira em 14/09/2026**. Antes disso, gere um novo ou migre para System User.
5. **Recomendado: token permanente de System User** (não expira), gerado na Business Manager:
   1. Business Settings > Users > **System Users** > Add (tipo Admin ou Employee).
   2. Atribua os ativos (contas de anúncio) ao System User.
   3. **Generate Token** com os escopos `ads_management`, `ads_read`, `read_insights`.
   4. Cole o token no modal **Token** do meugestor (obrigatório para operações de escrita; o `META_ACCESS_TOKEN` do `.env` vale apenas como fallback de leitura).
