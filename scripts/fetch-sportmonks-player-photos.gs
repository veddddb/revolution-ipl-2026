/**
 * Google Apps Script helper for filling player mugshot URLs.
 *
 * Sheet setup:
 * - Sheet name: IPL 2026 Players
 * - Column H: SportMonks player ID
 * - Column I: SportMonks image_path / mugshot URL written by this script
 *
 * Before running:
 * 1. Open Apps Script from the Google Sheet.
 * 2. Project Settings > Script Properties: add SPORTMONKS_API_TOKEN = your token.
 * 3. Paste this file into the Apps Script editor and run fillSportMonksPhotoUrls().
 */
const SPORTMONKS_PHOTO_CONFIG = {
  sheetName: 'IPL 2026 Players',
  startRow: 2,
  playerIdColumn: 8, // H
  photoUrlColumn: 9, // I
  overwriteExisting: false,
  requestDelayMs: 250,
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SportMonks')
    .addItem('Fill player photo URLs', 'fillSportMonksPhotoUrls')
    .addToUi();
}

function fillSportMonksPhotoUrls() {
  const token = PropertiesService.getScriptProperties().getProperty('SPORTMONKS_API_TOKEN');
  if (!token) {
    throw new Error('Missing SPORTMONKS_API_TOKEN script property. Add it in Apps Script Project Settings.');
  }

  const cfg = SPORTMONKS_PHOTO_CONFIG;
  const sheet = SpreadsheetApp.getActive().getSheetByName(cfg.sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${cfg.sheetName}`);

  const lastRow = sheet.getLastRow();
  if (lastRow < cfg.startRow) return;

  const rowCount = lastRow - cfg.startRow + 1;
  const playerIds = sheet.getRange(cfg.startRow, cfg.playerIdColumn, rowCount, 1).getValues();
  const currentUrls = sheet.getRange(cfg.startRow, cfg.photoUrlColumn, rowCount, 1).getValues();
  const output = currentUrls.map(row => [row[0] || '']);

  const cache = {};
  playerIds.forEach((row, index) => {
    const playerId = String(row[0] || '').trim();
    const existingUrl = String(currentUrls[index][0] || '').trim();

    if (!playerId || (!cfg.overwriteExisting && existingUrl)) return;
    if (!/^\d+$/.test(playerId)) {
      output[index][0] = '';
      return;
    }

    if (!cache[playerId]) {
      cache[playerId] = fetchSportMonksImagePath_(playerId, token);
      Utilities.sleep(cfg.requestDelayMs);
    }
    output[index][0] = cache[playerId] || '';
  });

  sheet.getRange(cfg.startRow, cfg.photoUrlColumn, rowCount, 1).setValues(output);
}

function fetchSportMonksImagePath_(playerId, token) {
  const url = `https://cricket.sportmonks.com/api/v2.0/players/${encodeURIComponent(playerId)}?api_token=${encodeURIComponent(token)}`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    console.warn(`SportMonks player ${playerId} failed with HTTP ${status}`);
    return '';
  }

  const json = JSON.parse(response.getContentText());
  return json && json.data && json.data.image_path ? String(json.data.image_path).trim() : '';
}
