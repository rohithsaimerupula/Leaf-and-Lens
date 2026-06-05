import { NextResponse } from 'next/server';

// GET /api/sheet-config
// Returns the Apps Script webhook URL so the admin panel can call it directly.
// This avoids Vercel function timeouts when uploading 166 images to Drive.
export async function GET() {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEET_WEBHOOK_URL is not configured.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ webhookUrl });
}
