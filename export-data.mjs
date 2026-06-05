import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Load variables from .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const tursoUrl = process.env.NEXT_PUBLIC_TURSO_DATABASE_URL;
const tursoToken = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Missing Turso database credentials in .env.local!");
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

// Helper function to extract base64 data and write to a file
function saveBase64Image(dataString, folder, filename) {
  if (!dataString) return '';
  
  // Example format: data:image/png;base64,iVBORw0KGgo...
  const matches = dataString.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (matches && matches.length === 3) {
    const extension = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Ensure filename is safe
    const safeFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fullFilename = `${safeFilename}.${extension}`;
    const filePath = path.join(folder, fullFilename);
    
    fs.writeFileSync(filePath, buffer);
    return fullFilename;
  }
  
  return 'Invalid format or not a base64 string';
}

// Ensure export directories exist
const exportDir = path.join(process.cwd(), 'export');
const photosDir = path.join(exportDir, 'photos');
const paymentsDir = path.join(exportDir, 'payments');

if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir);
if (!fs.existsSync(paymentsDir)) fs.mkdirSync(paymentsDir);

async function exportData() {
  console.log("Connecting to Database...");
  
  try {
    const result = await client.execute("SELECT * FROM submissions");
    const rows = result.rows;
    
    console.log(`Found ${rows.length} registrations. Exporting...`);
    
    // Setup CSV content
    const csvHeaders = [
      "Team Name", "Participation Type", "Status",
      "Member 1 Name", "Member 1 Roll", "Member 1 Phone", "Member 1 Branch",
      "Member 2 Name", "Member 2 Roll", "Member 2 Phone", "Member 2 Branch",
      "Photo File", "Payment File", "Transaction ID", "Submitted At"
    ];
    let csvContent = csvHeaders.join(',') + '\n';
    
    for (const row of rows) {
      // Create safe identifiers for the images
      const identifier = `${row.teamName}_${row.member1Name}`.replace(/\s+/g, '-');
      
      let photoFilename = '';
      if (row.photoUrl) {
        photoFilename = saveBase64Image(row.photoUrl, photosDir, `${identifier}_photo`);
      }
      
      let paymentFilename = '';
      if (row.paymentScreenshotUrl) {
        paymentFilename = saveBase64Image(row.paymentScreenshotUrl, paymentsDir, `${identifier}_payment`);
      }
      
      // Escape CSV values
      const escape = (str) => {
        if (!str) return '';
        const cleaned = String(str).replace(/"/g, '""');
        return `"${cleaned}"`;
      };
      
      const csvRow = [
        escape(row.teamName), escape(row.participationType), escape(row.status),
        escape(row.member1Name), escape(row.member1Roll), escape(row.member1Phone), escape(row.branch),
        escape(row.member2Name), escape(row.member2Roll), escape(row.member2Phone), escape(row.member2Branch),
        escape(photoFilename), escape(paymentFilename), escape(row.transactionId), escape(row.submittedAt)
      ];
      
      csvContent += csvRow.join(',') + '\n';
    }
    
    fs.writeFileSync(path.join(exportDir, 'registrations.csv'), csvContent);
    
    console.log("\n✅ Export Complete!");
    console.log(`The data has been saved to the 'export' folder:`);
    console.log(`- CSV File: export/registrations.csv`);
    console.log(`- Photos Folder: export/photos`);
    console.log(`- Payments Folder: export/payments`);
    console.log(`\nYou can now zip this folder and upload it to Google Drive to share!`);
    
  } catch (error) {
    console.error("Error exporting data:", error);
  }
}

exportData();
