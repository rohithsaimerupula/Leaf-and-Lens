// ═══════════════════════════════════════════════════════════════
//  LEAF & LENS 2026 — Google Sheets Webhook  v3.1
//
//  DEPLOYMENT STEPS:
//  1. In script.google.com: Select All (Ctrl+A) → Delete → Paste this file
//  2. Save (Ctrl+S)
//  3. Click "Deploy" → "Manage deployments"
//  4. Click the pencil ✏ icon on your existing deployment
//  5. Set Version = "New version"
//  6. Click "Deploy"  (URL stays the same – no change needed in .env)
//  7. Clear all data rows in the Google Sheet (keep the header row)
//  8. Click "Sync to Google Sheet" in your admin panel
// ═══════════════════════════════════════════════════════════════

// ── CONFIG — already filled in for you ───────────────────────
var SHEET_ID        = '1BdcG7zpTfmrm3uh12gSeoaHUDA_pbihbZfHwjWbzuQc';
var DRIVE_FOLDER_ID = '1zXz7qrCe-tD7A-DkJjn_OnSsmN6RJfn3';
var SHEET_TAB_NAME  = 'Registrations';

// ── Column headers (order must match buildRow below) ──────────
var HEADERS = [
  'Submission ID',
  'Timestamp',
  'Team Lead Name',
  'Team Lead Reg No.',
  'Team Lead Phone',
  'Team Lead Email',
  'Team Name',
  'Branch',
  'Section',
  'Member 2 Name',
  'Member 2 Reg No.',
  'Category',
  'Amount (Rs.)',
  'UTR / Transaction ID',
  'Payment Screenshot',
  'AI Flags',
  'Status'
];

// ── Get or create the sheet tab ───────────────────────────────
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

// ── Convert one data record to a row array ────────────────────
// isBulk = true  →  bulk export from Next.js (base64 already stripped)
// isBulk = false →  real-time single registration (may have base64)
function buildRow(data, isBulk) {
  var amount        = data.participationType === 'Both' ? 50 : 30;
  var screenshot    = data.paymentScreenshotUrl || 'N/A';

  // For real-time single entries: try uploading base64 screenshot to Drive
  if (!isBulk && screenshot.indexOf('data:image') === 0) {
    screenshot = uploadToDrive(screenshot, data.id);
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

// ── Safely upload a base64 image to Drive ─────────────────────
function uploadToDrive(dataUri, submissionId) {
  try {
    var mimeMatch = dataUri.match(/^data:(image\/\w+);base64,/);
    if (!mimeMatch) return 'Invalid image format';
    var mimeType  = mimeMatch[1];
    var ext       = mimeType === 'image/png' ? '.png' : '.jpg';
    var b64       = dataUri.replace(/^data:image\/\w+;base64,/, '');

    // Ensure valid base64 padding
    while (b64.length % 4 !== 0) b64 += '=';

    var bytes  = Utilities.base64Decode(b64);
    var blob   = Utilities.newBlob(bytes, mimeType, 'payment_' + submissionId + ext);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return '[Drive upload failed: ' + err.message + ']';
  }
}

// ── Main request handler ──────────────────────────────────────
function doPost(e) {
  try {
    var parsed  = JSON.parse(e.postData.contents);
    var isBulk  = Array.isArray(parsed);
    var records = isBulk ? parsed : [parsed];

    Logger.log('doPost received ' + records.length + ' records, isBulk=' + isBulk);

    var sheet   = getSheet();
    var rows    = [];

    for (var i = 0; i < records.length; i++) {
      rows.push(buildRow(records[i], isBulk));
    }

    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);
      Logger.log('Wrote ' + rows.length + ' rows starting at row ' + startRow);
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

// ── Health check (open the Web App URL in a browser to verify) ─
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'OK', version: 'v3.1' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── TEST FUNCTION — run this manually inside the editor ────────
// Click the function dropdown → select "testWrite" → press ▶ Run
// Then check your sheet — if a row appears the script is working.
function testWrite() {
  var sheet = getSheet();
  var testRow = buildRow({
    id: 'TEST-001',
    submittedAt: new Date().toISOString(),
    member1Name: 'Test User',
    member1Roll: '22A91A0000',
    member1Phone: '9999999999',
    member1Email: 'test@test.com',
    teamName: 'Test Team',
    branch: 'CSE',
    section: 'A',
    member2Name: '',
    member2Roll: '',
    participationType: 'Photo',
    transactionId: 'TXN123',
    paymentScreenshotUrl: '[Test - no image]',
    aiFlags: 'None',
    status: 'approved'
  }, true);

  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, 1, HEADERS.length).setValues([testRow]);
  Logger.log('testWrite: wrote test row at row ' + startRow);
}
