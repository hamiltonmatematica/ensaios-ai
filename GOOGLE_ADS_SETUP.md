# Google Ads — como conectar (via planilha, sem OAuth)

Depois de esbarrar em bloqueios de criação de app no Google Cloud, hierarquia de MCC e erros genéricos de autenticação da API do Google Ads, trocamos de arquitetura: em vez de OAuth2 + Developer Token + API do Google Ads, um **Google Ads Script roda dentro da sua conta** (sem nenhuma credencial nossa) e exporta as métricas diárias pra uma Google Sheets. O meugestor só lê essa planilha.

Vantagens: zero Google Cloud, zero developer token, zero problema de hierarquia de MCC — o script roda com a sua própria sessão logada, então enxerga exatamente as contas que você já gerencia. Desvantagem: os dados atualizam no ritmo que você configurar (recomendado: 1x por dia), não em tempo real.

Veja também [GOOGLE_ADS_INTEGRATION.md](GOOGLE_ADS_INTEGRATION.md) para o histórico da tentativa anterior (via API oficial) e por que trocamos.

## 1) Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco (pode deixar sem nome ou nomear "Meu Gestor — Google Ads").
2. Copie a URL da planilha (barra de endereço do navegador) — algo como `https://docs.google.com/spreadsheets/d/1AbC.../edit`.

## 2) Colar o script no Google Ads

1. Entre no [Google Ads](https://ads.google.com) **com a conta MCC** (a que enxerga todas as contas de cliente que você gerencia).
2. Vá em **Ferramentas e configurações (ícone de chave inglesa) → Ações em massa → Scripts**.
3. Clique em **+ Novo script**.
4. Apague o conteúdo padrão e cole o conteúdo de [`scripts/google-ads-export.gs`](scripts/google-ads-export.gs) deste repositório.
5. Na linha `var SHEET_URL = 'COLE_AQUI_A_URL_DA_SUA_GOOGLE_SHEETS';`, troque pelo URL copiado no passo 1.
6. Clique em **Salvar**.

## 3) Rodar e autorizar

1. Clique em **Visualizar** (ou **Executar**) — na primeira vez o Google vai pedir autorização (é a sua própria conta Google autorizando o próprio script, não um app externo). Aceite.
2. Depois de rodar, abra a planilha — deve ter uma aba **"dados"** com colunas `date, account_id, account_name, cost, impressions, clicks, conversions`, uma linha por dia por conta (últimos 90 dias).
3. Se der erro em alguma conta específica, o script pula ela e continua as outras — confira o log (aba "Registros de execução") pra ver quais.

## 4) Agendar execução diária

1. Ainda na tela do script, clique em **Frequência** (ou no ícone de relógio).
2. Configure **Diariamente**, no horário que preferir (ex: 6h da manhã).
3. Salve. A partir daí a planilha se atualiza sozinha todo dia, sem você precisar tocar em nada.

## 5) Publicar a planilha como CSV

1. Na planilha, abra a aba **"dados"**.
2. Menu **Arquivo → Compartilhar → Publicar na web**.
3. Em "Link", selecione a aba **"dados"** (não "Todo o documento") e o formato **CSV**.
4. Clique em **Publicar** → confirme.
5. Copie o link gerado (algo como `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv`).

**Nota de privacidade**: "Publicar na web" deixa esse link acessível a qualquer pessoa que o tenha (não aparece em buscas, mas não tem senha) — como o conteúdo é só gasto/cliques/impressões/conversões por conta (sem dados de clientes finais), o risco é baixo, mas não compartilhe esse link publicamente.

## 6) Colar no meugestor

No meugestor, clique no botão **"Google Ads"** no topo do dashboard → cole o link do CSV do passo anterior → **Testar planilha** (confirma que está lendo certo) → **Salvar**.

Pronto — as contas do Google Ads aparecem na mesma lista das contas Meta, com o total do período selecionado e comparação com o período anterior, exatamente como já funciona pro Meta.
