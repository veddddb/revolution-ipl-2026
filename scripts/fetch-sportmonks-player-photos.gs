/**
 * Google Apps Script helper for filling player mugshot URLs.
 *
 * Sheet setup:
 * - Sheet name: IPL 2026 Players
 * - Column H: SportMonks player ID
 * - Column I: SportMonks image_path / mugshot URL written by this script
 *
 * Auth setup:
 * - Uses CRICKET_API_KEY from config.gs first.
 * - Falls back to API_TOKEN from config.gs if present.
 * - Falls back to Script Properties keys CRICKET_API_KEY, API_TOKEN, or SPORTMONKS_API_TOKEN.
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
  const token = getCricketApiToken_();

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

function getCricketApiToken_() {
  const configGlobals = ['CRICKET_API_KEY', 'API_TOKEN', 'SPORTMONKS_API_TOKEN'];
  for (const key of configGlobals) {
    try {
      if (typeof globalThis !== 'undefined' && globalThis[key]) return String(globalThis[key]).trim();
    } catch (e) {}
  }

  const props = PropertiesService.getScriptProperties();
  for (const key of configGlobals) {
    const value = props.getProperty(key);
    if (value) return String(value).trim();
  }

  throw new Error('Missing cricket API token. Define CRICKET_API_KEY in config.gs, or add CRICKET_API_KEY/API_TOKEN to Script Properties.');
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
