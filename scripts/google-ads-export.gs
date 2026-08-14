/**
 * Google Ads Script — exporta métricas diárias de todas as contas do MCC
 * para uma Google Sheets. Roda DENTRO do Google Ads (Ferramentas e
 * configurações > Ações em massa > Scripts), na conta MCC — não usa OAuth,
 * Google Cloud nem developer token.
 *
 * Setup (veja GOOGLE_ADS_SETUP.md para o passo a passo completo):
 * 1. Troque SHEET_URL abaixo pela URL da sua Google Sheets em branco.
 * 2. Cole este script em Scripts, rode uma vez para autorizar.
 * 3. Configure um gatilho (trigger) diário.
 * 4. Publique a aba "dados" na web como CSV e cole essa URL no meugestor.
 */

var SHEET_URL = 'COLE_AQUI_A_URL_DA_SUA_GOOGLE_SHEETS';
var SHEET_NAME = 'dados';
var DAYS_BACK = 90;

function main() {
    var accountSelector = AdsManagerApp.accounts().withLimit(50);
    accountSelector.executeInParallel('processClientAccount', 'aggregateResults');
}

function processClientAccount() {
    var account = AdsApp.currentAccount();
    var query =
        'SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions ' +
        'FROM customer ' +
        'WHERE segments.date DURING LAST_' + DAYS_BACK + '_DAYS';

    var rows = AdsApp.search(query);
    var days = [];
    while (rows.hasNext()) {
        var row = rows.next();
        days.push({
            date: row.segments.date,
            cost: Number(row.metrics.costMicros || 0) / 1e6,
            impressions: Number(row.metrics.impressions || 0),
            clicks: Number(row.metrics.clicks || 0),
            conversions: Number(row.metrics.conversions || 0),
        });
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
    sheet.appendRow(['date', 'account_id', 'account_name', 'cost', 'impressions', 'clicks', 'conversions']);

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
            rowsToWrite.push([d.date, data.accountId, data.accountName, d.cost, d.impressions, d.clicks, d.conversions]);
        }
    }

    if (rowsToWrite.length > 0) {
        sheet.getRange(2, 1, rowsToWrite.length, 7).setValues(rowsToWrite);
    }

    if (errors.length > 0) {
        Logger.log('Contas com erro: ' + errors.join(' | '));
    }
    Logger.log('Exportado: ' + rowsToWrite.length + ' linhas de ' + results.length + ' contas.');
}
