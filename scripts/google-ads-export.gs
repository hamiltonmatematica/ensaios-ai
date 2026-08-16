/**
 * Google Ads Script — exporta métricas diárias de todas as contas do MCC
 * para uma Google Sheets. Roda DENTRO do Google Ads (Ferramentas e
 * configurações > Ações em massa > Scripts), na conta MCC — não usa OAuth,
 * Google Cloud nem developer token.
 *
 * Exporta duas abas:
 *  - "dados": 1 linha por conta por dia (histórico longo — comparativos de
 *    período, inclusive ano-a-ano).
 *  - "campanhas": 1 linha por grupo de anúncios por dia (histórico mais
 *    curto — usado pro drill-down conta > campanha > grupo de anúncios).
 *
 * Setup (veja GOOGLE_ADS_SETUP.md para o passo a passo completo):
 * 1. Troque SHEET_URL abaixo pela URL da sua Google Sheets em branco.
 * 2. Cole este script em Scripts, rode uma vez para autorizar.
 * 3. Configure um gatilho (trigger) diário.
 * 4. Publique as abas "dados" e "campanhas" na web como CSV (uma URL cada)
 *    e cole as duas no meugestor.
 */

var SHEET_URL = 'COLE_AQUI_A_URL_DA_SUA_GOOGLE_SHEETS';
var SHEET_NAME = 'dados';
var DAYS_BACK = 395; // ~13 meses — cobre comparativos de mês/semana anterior e também ano-a-ano

var CAMPAIGNS_SHEET_NAME = 'campanhas';
var CAMPAIGNS_DAYS_BACK = 90; // ~3 meses — nível de detalhe mais fundo, histórico mais curto pra não explodir o tamanho da planilha

// Métricas somáveis (nunca uma razão/média pré-calculada — CTR/CPC/CPM/CPL/ROAS
// são recalculados no meugestor a partir das somas, pra continuar correto
// depois de agregar por período).
var METRICS_SELECT =
    'metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value, ' +
    'metrics.all_conversions, metrics.all_conversions_value, metrics.view_through_conversions, metrics.interactions';

function main() {
    var accountSelector = AdsManagerApp.accounts().withLimit(50);
    accountSelector.executeInParallel('processClientAccount', 'aggregateResults');
    accountSelector.executeInParallel('processClientAccountCampaigns', 'aggregateCampaignResults');
}

function dateRangeStrings(daysBack, tz) {
    var today = new Date();
    var startDate = new Date();
    startDate.setDate(today.getDate() - daysBack);
    // Data explícita (BETWEEN) em vez de um atalho tipo LAST_N_DAYS — o Google
    // Ads só aceita um conjunto fixo de atalhos pré-definidos, então um DAYS_BACK
    // arbitrário quebraria a query se usássemos LAST_N_DAYS.
    return {
        since: Utilities.formatDate(startDate, tz, 'yyyy-MM-dd'),
        until: Utilities.formatDate(today, tz, 'yyyy-MM-dd'),
    };
}

function readMetrics(m) {
    return {
        cost: Number(m.costMicros || 0) / 1e6,
        impressions: Number(m.impressions || 0),
        clicks: Number(m.clicks || 0),
        conversions: Number(m.conversions || 0),
        conversionsValue: Number(m.conversionsValue || 0),
        allConversions: Number(m.allConversions || 0),
        allConversionsValue: Number(m.allConversionsValue || 0),
        viewThroughConversions: Number(m.viewThroughConversions || 0),
        interactions: Number(m.interactions || 0),
    };
}

// ─────────────────────────────────────────────────────────────
// EXPORT 1: conta por dia (aba "dados")
// ─────────────────────────────────────────────────────────────

function processClientAccount() {
    var account = AdsApp.currentAccount();
    var range = dateRangeStrings(DAYS_BACK, account.getTimeZone());

    var query =
        'SELECT segments.date, ' + METRICS_SELECT + ' ' +
        'FROM customer ' +
        "WHERE segments.date BETWEEN '" + range.since + "' AND '" + range.until + "'";

    var rows = AdsApp.search(query);
    var days = [];
    while (rows.hasNext()) {
        var row = rows.next();
        var m = readMetrics(row.metrics);
        m.date = row.segments.date;
        days.push(m);
    }

    return JSON.stringify({
        accountId: account.getCustomerId(),
        accountName: account.getName(),
        days: days,
    });
}

function aggregateResults(results) {
    var ss = SpreadsheetApp.openByUrl(SHEET_URL);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    sheet.clearContents();
    sheet.appendRow(['date', 'account_id', 'account_name', 'cost', 'impressions', 'clicks', 'conversions', 'conversions_value',
        'all_conversions', 'all_conversions_value', 'view_through_conversions', 'interactions']);

    var rowsToWrite = [];
    var errors = [];
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.getStatus() !== 'OK') {
            errors.push(result.getStatus() + ': ' + result.getError());
            continue;
        }
        var data = JSON.parse(result.getReturnValue());
        for (var j = 0; j < data.days.length; j++) {
            var d = data.days[j];
            rowsToWrite.push([d.date, data.accountId, data.accountName, d.cost, d.impressions, d.clicks, d.conversions, d.conversionsValue,
                d.allConversions, d.allConversionsValue, d.viewThroughConversions, d.interactions]);
        }
    }

    if (rowsToWrite.length > 0) {
        sheet.getRange(2, 1, rowsToWrite.length, 12).setValues(rowsToWrite);
    }

    if (errors.length > 0) {
        Logger.log('[dados] Contas com erro: ' + errors.join(' | '));
    }
    Logger.log('[dados] Exportado: ' + rowsToWrite.length + ' linhas de ' + results.length + ' contas.');
}

// ─────────────────────────────────────────────────────────────
// EXPORT 2: grupo de anúncios por dia (aba "campanhas")
// ─────────────────────────────────────────────────────────────

function processClientAccountCampaigns() {
    var account = AdsApp.currentAccount();
    var range = dateRangeStrings(CAMPAIGNS_DAYS_BACK, account.getTimeZone());

    var query =
        'SELECT campaign.id, campaign.name, campaign.status, ' +
        'ad_group.id, ad_group.name, ad_group.status, ' +
        'segments.date, ' + METRICS_SELECT + ' ' +
        'FROM ad_group ' +
        "WHERE segments.date BETWEEN '" + range.since + "' AND '" + range.until + "'";

    var rows = AdsApp.search(query);
    var days = [];
    while (rows.hasNext()) {
        var row = rows.next();
        var m = readMetrics(row.metrics);
        m.date = row.segments.date;
        m.campaignId = row.campaign.id;
        m.campaignName = row.campaign.name;
        m.campaignStatus = row.campaign.status;
        m.adGroupId = row.adGroup.id;
        m.adGroupName = row.adGroup.name;
        m.adGroupStatus = row.adGroup.status;
        days.push(m);
    }

    return JSON.stringify({
        accountId: account.getCustomerId(),
        days: days,
    });
}

function aggregateCampaignResults(results) {
    var ss = SpreadsheetApp.openByUrl(SHEET_URL);
    var sheet = ss.getSheetByName(CAMPAIGNS_SHEET_NAME) || ss.insertSheet(CAMPAIGNS_SHEET_NAME);
    sheet.clearContents();
    sheet.appendRow(['date', 'account_id', 'campaign_id', 'campaign_name', 'campaign_status',
        'adgroup_id', 'adgroup_name', 'adgroup_status',
        'cost', 'impressions', 'clicks', 'conversions', 'conversions_value',
        'all_conversions', 'all_conversions_value', 'view_through_conversions', 'interactions']);

    var rowsToWrite = [];
    var errors = [];
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.getStatus() !== 'OK') {
            errors.push(result.getStatus() + ': ' + result.getError());
            continue;
        }
        var data = JSON.parse(result.getReturnValue());
        for (var j = 0; j < data.days.length; j++) {
            var d = data.days[j];
            rowsToWrite.push([d.date, data.accountId, d.campaignId, d.campaignName, d.campaignStatus,
                d.adGroupId, d.adGroupName, d.adGroupStatus,
                d.cost, d.impressions, d.clicks, d.conversions, d.conversionsValue,
                d.allConversions, d.allConversionsValue, d.viewThroughConversions, d.interactions]);
        }
    }

    if (rowsToWrite.length > 0) {
        sheet.getRange(2, 1, rowsToWrite.length, 17).setValues(rowsToWrite);
    }

    if (errors.length > 0) {
        Logger.log('[campanhas] Contas com erro: ' + errors.join(' | '));
    }
    Logger.log('[campanhas] Exportado: ' + rowsToWrite.length + ' linhas de ' + results.length + ' contas.');
}
