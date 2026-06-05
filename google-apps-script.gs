// ═══════════════════════════════════════════════════════════════
//  LEAF & LENS 2026 — Google Sheets Webhook  v5
//
//  DEPLOY STEPS (do this once):
//  1. script.google.com → your project → Ctrl+A → Delete → Paste this
//  2. Ctrl+S to save
//  3. Deploy → Manage deployments → pencil ✏ → "New version" → Deploy
//  4. Open the Web App URL in browser → must show {"status":"OK","version":"v5"}
//  5. Clear all data rows in the sheet (keep row 1 header)
//  6. Click "Sync to Google Sheet" in admin panel
// ═══════════════════════════════════════════════════════════════

var SHEET_ID       = '1BdcG7zpTfmrm3uh12gSeoaHUDA_pbihbZfHwjWbzuQc';
var DRIVE_FOLDER_ID = '1zXz7qrCe-tD7A-DkJjn_OnSsmN6RJfn3';
var SHEET_TAB_NAME = 'Registrations';

var HEADERS = [
  'Submission ID', 'Timestamp', 'Team Lead Name', 'Team Lead Reg No.',
  'Team Lead Phone', 'Team Lead Email', 'Team Name', 'Branch', 'Section',
  'Member 2 Name', 'Member 2 Reg No.', 'Category', 'Amount (Rs.)',
  'UTR / Transaction ID', 'Payment Screenshot', 'AI Flags', 'Status'
];

// ── Sheet helper ──────────────────────────────────────────────
function getSheet() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB_NAME);
    var hdr = sheet.getRange(1, 1, 1, HEADERS.length);
    hdr.setValues([HEADERS]);
    hdr.setBackground('#1a3a22');
    hdr.setFontColor('#c9a84c');
    hdr.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Drive upload (real-time single entries only) ──────────────
function uploadToDrive(dataUri, submissionId) {
  if (!DRIVE_FOLDER_ID || DRIVE_FOLDER_ID === 'YOUR_DRIVE_FOLDER_ID_HERE') return 'N/A';
  if (!dataUri || dataUri.indexOf('data:image') !== 0) return dataUri || 'N/A';
  try {
    var mimeMatch = dataUri.match(/^data:(image\/[\w+]+);base64,/);
    if (!mimeMatch) return '[Invalid image]';
    var mimeType = mimeMatch[1];
    var ext      = mimeType === 'image/png' ? '.png' : '.jpg';
    var b64      = dataUri.replace(/^data:image\/[\w+]+;base64,/, '').trim();
    var pad = b64.length % 4;
    if (pad === 2) b64 += '=='; else if (pad === 3) b64 += '=';
    var blob   = Utilities.newBlob(Utilities.base64Decode(b64), mimeType, 'payment_' + submissionId + ext);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return '[Upload failed: ' + err.message + ']';
  }
}

// ── Build one row ─────────────────────────────────────────────
// isBulk=true  → skip Drive upload, write screenshot placeholder
// isBulk=false → real-time single registration, upload to Drive
function buildRow(data, isBulk) {
  var amount     = data.participationType === 'Both' ? 50 : 30;
  var screenshot = data.paymentScreenshotUrl || 'N/A';

  if (!isBulk && screenshot.indexOf('data:image') === 0) {
    screenshot = uploadToDrive(screenshot, data.id);
  } else if (isBulk && (screenshot.indexOf('data:image') === 0 || screenshot === 'N/A')) {
    // Keep a clean label; no Drive upload in bulk path (prevents 6-min timeout)
    screenshot = screenshot.indexOf('data:image') === 0 ? '[Screenshot in DB]' : 'N/A';
  }

  return [
    String(data.id                || ''),
    String(data.submittedAt       || ''),
    String(data.member1Name       || ''),
    String(data.member1Roll       || ''),
    String(data.member1Phone      || ''),
    String(data.member1Email      || ''),
    String(data.teamName          || ''),
    String(data.branch            || ''),
    String(data.section           || ''),
    String(data.member2Name       || ''),
    String(data.member2Roll       || ''),
    String(data.participationType || ''),
    'Rs.' + amount,
    String(data.transactionId     || ''),
    screenshot,
    String(data.aiFlags           || 'None'),
    String(data.status            || 'pending')
  ];
}

// ── Main POST handler ─────────────────────────────────────────
function doPost(e) {
  try {
    var parsed  = JSON.parse(e.postData.contents);
    var isBulk  = Array.isArray(parsed);
    var records = isBulk ? parsed : [parsed];

    Logger.log('doPost v5: ' + records.length + ' record(s), isBulk=' + isBulk);

    var sheet = getSheet();
    var rows  = [];
    for (var i = 0; i < records.length; i++) {
      rows.push(buildRow(records[i], isBulk));
    }

    if (rows.length > 0) {
      var start = sheet.getLastRow() + 1;
      sheet.getRange(start, 1, rows.length, HEADERS.length).setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost ERROR: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── GET — health check ────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'OK', version: 'v5' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── testWrite — run manually to verify script works ───────────
function testWrite() {
  var sheet = getSheet();
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length)
    .setValues([buildRow({
      id: 'TEST-001', submittedAt: new Date().toISOString(),
      member1Name: 'Test User', member1Roll: '22A91A0000',
      member1Phone: '9999999999', member1Email: 'test@test.com',
      teamName: 'Test Team', branch: 'CSE', section: 'A',
      member2Name: '', member2Roll: '', participationType: 'Photo',
      transactionId: 'TXN123', paymentScreenshotUrl: '[test]',
      aiFlags: 'None', status: 'approved'
    }, true)]);
  Logger.log('testWrite done');
}
