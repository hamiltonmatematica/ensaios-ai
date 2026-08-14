# Integração Google Ads no meugestor — Roadmap (histórico)

> **Abandonado em favor de uma arquitetura mais simples.** Este roadmap (OAuth2 + Developer Token + API oficial do Google Ads) foi implementado, mas esbarrou em: contas Google bloqueadas pra criar app no Cloud, a UI "Google Auth Platform" nova do console, e por fim erros de permissão por hierarquia de MCC (`login-customer-id` não resolve automaticamente pra contas em sub-MCCs diferentes). Trocamos para uma leitura via **Google Ads Script → Google Sheets publicada como CSV** — sem OAuth, sem developer token, sem Google Cloud. Veja [GOOGLE_ADS_SETUP.md](GOOGLE_ADS_SETUP.md) e [`scripts/google-ads-export.gs`](scripts/google-ads-export.gs) para a arquitetura atual. O conteúdo abaixo fica só como histórico/referência.

Roadmap honesto para adicionar Google Ads ao meugestor, espelhando a arquitetura já existente do Meta Ads. **Nenhum código foi escrito ainda — este documento é o plano.**

## a) Pré-requisitos (burocracia primeiro)

1. **Conta Google Ads manager (MCC)** — obrigatória para pedir o developer token e gerenciar múltiplas contas de clientes (equivalente à Business Manager da Meta).
2. **Google Cloud project** com credencial **OAuth2 client do tipo Web application** (Client ID + Client Secret), com redirect URI apontando para o callback do app.
3. **Developer token da Google Ads API**:
   - Solicitado no **API Center** dentro do MCC (Admin > API Center).
   - Nasce com acesso **Test** — só funciona com **contas de teste**.
   - Acesso **Basic** (contas reais) exige formulário de aprovação do Google: **dias a semanas** de espera. Este é o gargalo do cronograma — pedir no dia 1.

## b) Arquitetura (espelhando o meugestor Meta)

```
src/lib/googleads.ts                      # equivalente ao src/lib/facebook.ts
src/app/api/meugestor/gads/*              # rotas espelhando /api/meugestor/*
src/app/api/auth/google-ads/callback      # callback OAuth (troca code -> refresh token)
```

- **Cliente**: biblioteca `google-ads-api` (npm, não oficial mas madura) ou REST direto (`googleads.googleapis.com/v*/...`). A lib poupa boilerplate de auth e paginação.
- **Auth**: OAuth2 com **refresh token por usuário**. Fluxo: botão "Conectar Google Ads" > consentimento > rota `/api/auth/google-ads/callback` recebe o `code`, troca por refresh token e persiste. Access tokens são renovados automaticamente a partir do refresh token (diferente do Meta, onde o usuário cola um token de longa duração no modal).
- **Insights via GAQL** (Google Ads Query Language), espelhando os níveis do meugestor:
  - conta > `campaign` > `ad_group` > `ad_group_ad` (equivalente a conta > campanha > conjunto > anúncio).
  - Exemplo:
    ```sql
    SELECT campaign.id, campaign.name, metrics.cost_micros,
           metrics.conversions, metrics.ctr, metrics.impressions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    ```
- **Métricas equivalentes**: `cost_micros / 1e6` = gasto em moeda; `metrics.conversions` = resultados; `metrics.ctr`, `metrics.impressions`, `metrics.clicks`, `metrics.average_cpc` (também em micros).
- **Criação** (ordem obrigatória, cada objeto referencia o anterior):
  1. `CampaignBudget` (orçamento é um recurso separado, não um campo da campanha)
  2. `Campaign` (referencia o budget)
  3. `AdGroup`
  4. `ResponsiveSearchAd` (headlines + descriptions) dentro do ad group

## c) Diferenças-chave vs Meta

| Tema | Meta | Google Ads |
|---|---|---|
| Unidade monetária | **centavos** (R$ 50 = 5000) | **micros** (R$ 50 = 50.000.000) |
| Auth por requisição | access token | OAuth token + **developer token** + **customer id** + header **`login-customer-id`** (id do MCC) |
| Escrita | POST por objeto na Graph API | **mutations em batch** via services (`CampaignService.mutateCampaigns` etc.), várias operações atômicas por chamada |
| Validação | `execution_options: ["validate_only"]` global na URL/corpo | não há flag global; o **mutate request tem `validate_only`** (existe sim, por requisição) e também `partial_failure` (aplica o que passou e reporta erro por operação) |
| Query | endpoints + fields | **GAQL** (SQL-like) |
| Orçamento | campo da campanha/conjunto | **recurso separado** (`CampaignBudget`) referenciado pela campanha |

Atenção ao `partial_failure`: com ele ativado, um batch pode criar metade dos objetos. Tratar a resposta operação a operação, nunca assumir tudo-ou-nada.

## d) Plano em 4 fases

| Fase | Escopo | Estimativa |
|---|---|---|
| **1. Credenciais/OAuth** | MCC, Cloud project, OAuth client, developer token (pedir Basic no dia 1), rota `/api/auth/google-ads/callback`, persistência do refresh token | **1-2 dias** de trabalho + **espera da aprovação** do token (dias a semanas — desenvolver com conta de teste enquanto isso) |
| **2. Leitura/insights** | `src/lib/googleads.ts`, GAQL para campaign/ad_group/ad, conversão micros -> moeda, rotas `/api/meugestor/gads/*` espelhando accounts/campaigns/adsets/ads | **2-3 dias** |
| **3. UI unificada** | Switch Meta/Google no meugestor, mapeamento de métricas equivalentes nos KPIs, favoritos e export funcionando nas duas fontes | **2 dias** |
| **4. Criação** | budget -> campaign -> ad group -> responsive search ad, com `validate_only` no wizard e tudo pausado por padrão (mesma filosofia do Meta) | **3-5 dias** |

**Total de trabalho**: ~8-12 dias úteis. **Caminho crítico**: aprovação do developer token Basic — sem ela, fases 2-4 só rodam contra contas de teste.
