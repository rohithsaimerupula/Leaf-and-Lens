// ═══════════════════════════════════════════════════════════════
//  LEAF & LENS 2026 — Google Sheets Webhook  v4
//
//  DEPLOYMENT STEPS:
//  1. In script.google.com: Select All (Ctrl+A) → Delete → Paste this file
//  2. Save (Ctrl+S)
//  3. Click "Deploy" → "Manage deployments"
//  4. Click the pencil ✏ icon on your existing deployment
//  5. Set Version = "New version"
//  6. Click "Deploy"  (URL stays the same – no .env change needed)
//  7. Open the Web App URL in browser → should show {"status":"OK","version":"v4"}
//  8. Clear all data rows in the Google Sheet (keep header row)
//  9. Click "Sync to Google Sheet" in your admin panel
// ═══════════════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────────────
var SHEET_ID        = '1BdcG7zpTfmrm3uh12gSeoaHUDA_pbihbZfHwjWbzuQc';
var DRIVE_FOLDER_ID = '1zXz7qrCe-tD7A-DkJjn_OnSsmN6RJfn3';
var SHEET_TAB_NAME  = 'Registrations';

// ── Column headers ────────────────────────────────────────────
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

// ── Get or create the Registrations sheet tab ─────────────────
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

// ── Upload a base64 data URI to Google Drive ──────────────────
// Returns the public Drive URL on success, or a descriptive string on failure.
function uploadToDrive(dataUri, submissionId) {
  // No Drive folder configured
  if (!DRIVE_FOLDER_ID || DRIVE_FOLDER_ID === 'YOUR_DRIVE_FOLDER_ID_HERE') {
    return '[No Drive folder configured]';
  }
  // Not a base64 data URI — already a URL or placeholder
  if (!dataUri || dataUri.indexOf('data:image') !== 0) {
    return dataUri || 'N/A';
  }
  try {
    // Extract MIME type (supports jpeg, png, webp, gif)
    var mimeMatch = dataUri.match(/^data:(image\/[\w+]+);base64,/);
    if (!mimeMatch) return '[Invalid image format]';
    var mimeType = mimeMatch[1];
    var ext      = mimeType === 'image/png'  ? '.png'
                 : mimeType === 'image/webp' ? '.webp'
                 : mimeType === 'image/gif'  ? '.gif'
                 : '.jpg';

    // Strip prefix to get raw base64
    var b64 = dataUri.replace(/^data:image\/[\w+]+;base64,/, '').trim();

    // Ensure valid base64 padding (must be multiple of 4)
    var pad = b64.length % 4;
    if (pad === 2) b64 += '==';
    else if (pad === 3) b64 += '=';

    var bytes  = Utilities.base64Decode(b64);
    var blob   = Utilities.newBlob(bytes, mimeType, 'payment_' + submissionId + ext);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log('Drive upload error for ' + submissionId + ': ' + err.message);
    return '[Drive upload failed: ' + err.message + ']';
  }
}

// ── Build a single row array from a data record ───────────────
function buildRow(data) {
  var amount     = data.participationType === 'Both' ? 50 : 30;
  var screenshot = data.paymentScreenshotUrl || 'N/A';

  // Always attempt Drive upload for base64 images
  if (screenshot.indexOf('data:image') === 0) {
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

// ── Main POST handler ─────────────────────────────────────────
function doPost(e) {
  try {
    var parsed  = JSON.parse(e.postData.contents);
    var records = Array.isArray(parsed) ? parsed : [parsed];

    Logger.log('doPost: received ' + records.length + ' record(s)');

    var sheet = getSheet();
    var rows  = [];

    for (var i = 0; i < records.length; i++) {
      rows.push(buildRow(records[i]));
    }

    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);
      Logger.log('doPost: wrote ' + rows.length + ' row(s) at row ' + startRow);
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
    .createTextOutput(JSON.stringify({ status: 'OK', version: 'v4' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── testWrite — run manually in the editor to verify ─────────
function testWrite() {
  var sheet = getSheet();
  var row   = buildRow({
    id: 'TEST-001', submittedAt: new Date().toISOString(),
    member1Name: 'Test User', member1Roll: '22A91A0000',
    member1Phone: '9999999999', member1Email: 'test@test.com',
    teamName: 'Test Team', branch: 'CSE', section: 'A',
    member2Name: '', member2Roll: '', participationType: 'Photo',
    transactionId: 'TXN123', paymentScreenshotUrl: '[test - no image]',
    aiFlags: 'None', status: 'approved'
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length).setValues([row]);
  Logger.log('testWrite: done');
}
