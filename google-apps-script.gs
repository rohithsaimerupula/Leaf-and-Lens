// ═══════════════════════════════════════════════════════════════
//  LEAF & LENS 2026 — Google Sheets + Drive Webhook
//  HOW TO DEPLOY:
//  1. Go to https://script.google.com → New Project
//  2. Paste this entire file, replacing the default code
//  3. Set SHEET_ID below to your Google Sheet ID
//     (from the sheet URL: /spreadsheets/d/<SHEET_ID>/edit)
//  4. Set DRIVE_FOLDER_ID to a Google Drive folder ID where
//     payment screenshots will be saved
//  5. Click Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  6. Authorise and copy the Web App URL
//  7. Paste that URL as GOOGLE_SHEET_WEBHOOK_URL in your .env.local
// ═══════════════════════════════════════════════════════════════

const SHEET_ID        = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_TAB_NAME  = 'Registrations';
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'; // optional, for screenshots

// ── Headers (auto-created on first run) ──────────────────────
const HEADERS = [
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

// ── Main POST handler ─────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let sheet   = ss.getSheetByName(SHEET_TAB_NAME);

    // Create sheet + header row if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_TAB_NAME);
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setBackground('#1a3a22')
        .setFontColor('#c9a84c')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Amount based on category
    const amount = data.participationType === 'Both' ? 50 : 30;

    // Upload payment screenshot to Drive (if provided + folder configured)
    let screenshotLink = 'N/A';
    if (data.paymentScreenshotUrl && DRIVE_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID_HERE') {
      try {
        const b64 = data.paymentScreenshotUrl.replace(/^data:image\/\w+;base64,/, '');
        const blob = Utilities.newBlob(
          Utilities.base64Decode(b64),
          'image/jpeg',
          `screenshot_${data.id || Date.now()}.jpg`
        );
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const file   = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        screenshotLink = file.getUrl();
      } catch (err) {
        screenshotLink = 'Upload failed: ' + err.message;
      }
    } else if (data.paymentScreenshotUrl) {
      screenshotLink = 'Uploaded (no Drive folder set)';
    }

    // Append the row
    sheet.appendRow([
      data.id                  || '',
      data.submittedAt         || new Date().toISOString(),
      data.member1Name         || '',
      data.member1Roll         || '',
      data.member1Phone        || '',
      data.member1Email        || '',
      data.teamName            || '',
      data.branch              || '',
      data.section             || '',
      data.member2Name         || '',
      data.member2Roll         || '',
      data.participationType   || '',
      `₹${amount}`,
      data.transactionId       || '',
      screenshotLink,
      data.aiFlags             || 'None',
      data.status              || 'pending',
    ]);

    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, HEADERS.length);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
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
    .createTextOutput(JSON.stringify({ status: 'Leaf & Lens webhook active' }))
    .setMimeType(ContentService.MimeType.JSON);
}
