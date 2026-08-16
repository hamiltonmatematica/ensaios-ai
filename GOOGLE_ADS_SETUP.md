# Google Ads — como conectar (via planilha, sem OAuth)

Depois de esbarrar em bloqueios de criação de app no Google Cloud, hierarquia de MCC e erros genéricos de autenticação da API do Google Ads, trocamos de arquitetura: em vez de OAuth2 + Developer Token + API do Google Ads, um **Google Ads Script roda dentro da sua conta** (sem nenhuma credencial nossa) e exporta as métricas pra uma Google Sheets. O meugestor só lê essa planilha.

Vantagens: zero Google Cloud, zero developer token, zero problema de hierarquia de MCC — o script roda com a sua própria sessão logada, então enxerga exatamente as contas que você já gerencia. Desvantagem: os dados atualizam no ritmo que você configurar (recomendado: 1x por dia), não em tempo real.

Veja também [GOOGLE_ADS_INTEGRATION.md](GOOGLE_ADS_INTEGRATION.md) para o histórico da tentativa anterior (via API oficial) e por que trocamos.

**Você participa de mais de uma MCC?** Cada MCC precisa do seu próprio script + planilha, porque o script só enxerga as contas da MCC onde ele foi colado. Repita os passos 1-5 abaixo uma vez por MCC, e no passo 6 cole todas as URLs de CSV no meugestor — ele soma tudo automaticamente.

## O que o script exporta

O script escreve **duas abas** na mesma planilha:

- **"dados"** — 1 linha por conta por dia, histórico de ~13 meses (cobre comparativo de mês/semana anterior e também ano-a-ano). Alimenta a lista principal de contas.
- **"campanhas"** — 1 linha por grupo de anúncios por dia, histórico de ~3 meses. Alimenta o drill-down: clicar numa conta Google mostra as campanhas, clicar numa campanha mostra os grupos de anúncios (espelhando conta → campanha → conjunto do Meta).

Cada linha traz: `cost, impressions, clicks, conversions, conversions_value, all_conversions, all_conversions_value, view_through_conversions, interactions` — dessas, o meugestor calcula CTR, CPC, CPM, CPL, ROAS e CPA (todas (re)calculadas a partir das somas do período, nunca médias pré-prontas, então continuam corretas depois de agregar).

A aba "campanhas" é **opcional** — se você só quiser o total por conta (sem clicar pra ver campanhas), pode pular a publicação dela no passo 5 e deixar o campo em branco no meugestor.

## 1) Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco (pode deixar sem nome ou nomear "Meu Gestor — Google Ads — [nome da MCC]").
2. Copie a URL da planilha (barra de endereço do navegador) — algo como `https://docs.google.com/spreadsheets/d/1AbC.../edit`.

## 2) Colar o script no Google Ads

1. Entre no [Google Ads](https://ads.google.com) **com a conta MCC** (a que enxerga as contas de cliente que você gerencia nela).
2. Vá em **Ferramentas e configurações (ícone de chave inglesa) → Ações em massa → Scripts**.
3. Clique em **+ Novo script**.
4. Apague o conteúdo padrão e cole o conteúdo de [`scripts/google-ads-export.gs`](scripts/google-ads-export.gs) deste repositório.
5. Na linha `var SHEET_URL = 'COLE_AQUI_A_URL_DA_SUA_GOOGLE_SHEETS';`, troque pelo URL copiado no passo 1.
6. Clique em **Salvar**.

## 3) Rodar e autorizar

1. Clique em **Executar** — na primeira vez o Google vai pedir autorização (é a sua própria conta Google autorizando o próprio script, não um app externo). Aceite. O script faz duas exportações (contas + campanhas), então pode levar um pouco mais de tempo que antes — normal.
2. Depois de rodar, abra a planilha — deve ter duas abas, **"dados"** e **"campanhas"**, cada uma com uma linha por dia (por conta, ou por grupo de anúncios).
3. Se der erro em alguma conta específica, o script pula ela e continua as outras. Confira a aba **"Registros"** (do lado de "Alterações", na mesma tela do script) — tem linhas tipo `[dados] Exportado: X linhas de Y contas` e `[campanhas] Exportado: X linhas de Y contas`, e se algo falhou, `Contas com erro: ...`.
4. **Se alguma aba ficar só com o cabeçalho, sem nenhuma linha**: olhe a aba "Registros" — o motivo do erro vai estar lá. Causas comuns: a conta MCC não tem nenhuma conta de cliente vinculada ainda, ou alguma permissão pendente na primeira autorização (rode **Executar** de novo).

## 4) Agendar execução diária

A frequência não fica dentro do editor do script — fica na **lista de scripts**.

1. No editor, clique em **Salvar** e depois em **Fechar** (volta pra lista, link "Scripts" no topo).
2. Na lista, ache a linha do script (ex: "meugestor") — tem uma coluna **Frequência**.
3. Passe o mouse em cima do valor dessa coluna (deve estar em branco/"Uma vez") e clique no ícone de lápis que aparece.
4. Escolha **Diariamente**, o horário que preferir (ex: 6h da manhã) → **Salvar**.
5. A partir daí a planilha se atualiza sozinha todo dia, sem você precisar tocar em nada.

## 5) Publicar as abas como CSV

Repita esse processo **duas vezes** — uma pra cada aba:

1. Na planilha, abra a aba (**"dados"** primeiro, depois **"campanhas"**).
2. Menu **Arquivo → Compartilhar → Publicar na web**.
3. Em "Link", selecione a aba atual (não "Todo o documento") e o formato **CSV**.
4. Clique em **Publicar** → confirme.
5. Copie o link gerado (algo como `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv`) — guarde os dois links (dados e campanhas), você vai usar os dois no próximo passo.

**Nota de privacidade**: "Publicar na web" deixa esse link acessível a qualquer pessoa que o tenha (não aparece em buscas, mas não tem senha) — como o conteúdo é só gasto/cliques/impressões/conversões (sem dados de clientes finais), o risco é baixo, mas não compartilhe esses links publicamente.

## 6) Colar no meugestor

Repita os passos 1-5 pra cada MCC que você participa. No meugestor, clique no botão **"Google Ads"** no topo do dashboard:

- Cole a URL do CSV de **"dados"** de cada MCC no primeiro bloco ("Planilhas de CONTAS").
- Cole a URL do CSV de **"campanhas"** de cada MCC no segundo bloco ("Planilhas de CAMPANHAS") — opcional, mas necessário pro drill-down.
- **Testar planilhas** (confirma que tudo está lendo certo, mostra quantas linhas/contas cada planilha trouxe, e avisa separadamente se contas ou campanhas estão vazias).
- **Salvar**.

Pronto — as contas de todas as MCCs aparecem juntas na mesma lista das contas Meta, com o total do período selecionado e comparação com o período anterior (mês anterior, semana anterior, ano anterior — o que você escolher no seletor de período). Clicar numa conta Google mostra as campanhas; clicar numa campanha mostra os grupos de anúncios — igual o fluxo conta → campanha → conjunto do Meta.
