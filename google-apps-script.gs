// ═══════════════════════════════════════════════════════════════
//  LEAF & LENS 2026 — Google Sheets Webhook (v3)
//  HOW TO DEPLOY:
//  1. Go to https://script.google.com → New Project
//  2. Paste this entire file, replacing the default code
//  3. Set SHEET_ID below to your Google Sheet ID
//     (from the sheet URL: /spreadsheets/d/<SHEET_ID>/edit)
//  4. Optionally set DRIVE_FOLDER_ID to a Google Drive folder ID
//     where NEW real-time payment screenshots will be saved.
//     Leave as 'YOUR_DRIVE_FOLDER_ID_HERE' to skip Drive uploads.
//  5. Click Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone  ← IMPORTANT: must be Anyone
//  6. Authorise and copy the Web App URL
//  7. Paste that URL as GOOGLE_SHEET_WEBHOOK_URL in your .env.local
// ═══════════════════════════════════════════════════════════════

var SHEET_ID        = '1BdcG7zpTfmrm3uh12gSeoaHUDA_pbihbZfHwjWbzuQc';
var SHEET_TAB_NAME  = 'Registrations';
var DRIVE_FOLDER_ID = '1zXz7qrCe-tD7A-DkJjn_OnSsmN6RJfn3';

// ── Headers ───────────────────────────────────────────────────
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
  'Amount (₹)',
  'UTR Number',
  'Payment Screenshot',
  'AI Flags',
  'Status',
];

// ── Get or create the Registrations sheet ────────────────────
function getSheet() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB_NAME);
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#1a3a22');
    headerRange.setFontColor('#c9a84c');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Safely upload a base64 image to Google Drive ──────────────
// Returns Drive URL on success, or a descriptive fallback string.
function uploadToDrive(base64DataUri, submissionId) {
  // Only attempt if Drive folder is configured
  if (!DRIVE_FOLDER_ID || DRIVE_FOLDER_ID === 'YOUR_DRIVE_FOLDER_ID_HERE') {
    return 'Screenshot stored in DB (no Drive folder configured)';
  }

  // Only attempt if we actually have a base64 data URI
  if (!base64DataUri || base64DataUri.indexOf('data:image') !== 0) {
    return base64DataUri || 'N/A';
  }

  try {
    // Detect MIME type (jpeg or png)
    var mimeMatch = base64DataUri.match(/^data:(image\/\w+);base64,/);
    var mimeType  = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var ext       = mimeType === 'image/png' ? '.png' : '.jpg';

    // Strip the data URI prefix to get raw base64
    var b64 = base64DataUri.replace(/^data:image\/\w+;base64,/, '');

    // Pad to a valid base64 length (multiple of 4)
    while (b64.length % 4 !== 0) { b64 += '='; }

    var bytes  = Utilities.base64Decode(b64, Utilities.Charset.UTF_8);
    var blob   = Utilities.newBlob(bytes, mimeType, 'payment_' + submissionId + ext);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return 'Drive upload failed: ' + e.message;
  }
}

// ── Convert one data object to a row array ────────────────────
function buildRow(data, isBulkSync) {
  var amount = data.participationType === 'Both' ? 50 : 30;

  // For bulk sync, screenshots were already stripped server-side.
  // For real-time (single record), try Drive upload.
  var screenshotCell;
  if (isBulkSync) {
    // paymentScreenshotUrl arrives as a descriptive string, not raw base64
    screenshotCell = data.paymentScreenshotUrl || 'N/A';
  } else {
    screenshotCell = uploadToDrive(data.paymentScreenshotUrl, data.id);
  }

  return [
    data.id                || '',
    data.submittedAt       || new Date().toISOString(),
    data.member1Name       || '',
    data.member1Roll       || '',
    data.member1Phone      || '',
    data.member1Email      || '',
    data.teamName          || '',
    data.branch            || '',
    data.section           || '',
    data.member2Name       || '',
    data.member2Roll       || '',
    data.participationType || '',
    '\u20b9' + amount,       // ₹ symbol
    data.transactionId     || '',
    screenshotCell,
    data.aiFlags           || 'None',
    data.status            || 'pending',
  ];
}

// ── Main POST handler ─────────────────────────────────────────
function doPost(e) {
  try {
    var rawData   = JSON.parse(e.postData.contents);
    var isBulk    = Array.isArray(rawData);
    var dataList  = isBulk ? rawData : [rawData];
    var sheet     = getSheet();

    // Build all row arrays first (no Drive uploads in bulk mode)
    var newRows = [];
    for (var i = 0; i < dataList.length; i++) {
      newRows.push(buildRow(dataList[i], isBulk));
    }

    // Write all rows in one API call (much faster than appendRow in a loop)
    if (newRows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet
        .getRange(startRow, 1, newRows.length, HEADERS.length)
        .setValues(newRows);
    }

    // Only auto-resize for small batches (single entries) to avoid timeouts
    if (!isBulk) {
      sheet.autoResizeColumns(1, HEADERS.length);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, count: newRows.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── GET handler (health check) ────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Leaf & Lens webhook v3 active' }))
    .setMimeType(ContentService.MimeType.JSON);
}
