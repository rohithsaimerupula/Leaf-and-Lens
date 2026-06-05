import { NextResponse } from 'next/server';

// POST /api/export-to-sheet
// Body: { records: [...] }  — a pre-built batch of up to 30 entries
// Forwards the batch to the Apps Script webhook (no Drive uploads here).
// The admin panel calls this endpoint repeatedly, one batch at a time.
export async function POST(request: Request) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEET_WEBHOOK_URL is not configured.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const records: any[] = Array.isArray(body.records) ? body.records : [];

    if (records.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Forward to Apps Script — no base64 images, just row data
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(records),
    });

    const text = await res.text();

    let result: any = {};
    try { result = JSON.parse(text); } catch { /* Apps Script returned non-JSON */ }

    if (!res.ok || result.success === false) {
      return NextResponse.json(
        { error: result.error || `Apps Script returned HTTP ${res.status}`, details: text.substring(0, 300) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: result.count ?? records.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Batch proxy failed', details: error.message },
      { status: 500 }
    );
  }
}
