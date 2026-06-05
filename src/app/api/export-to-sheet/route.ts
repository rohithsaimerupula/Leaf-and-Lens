import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/export-to-sheet
// Fetches all existing registrations from DB and pushes them to Google Sheets
// Call this once from the browser to backfill all previous registrations.
export async function POST() {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEET_WEBHOOK_URL is not configured in environment variables.' },
      { status: 500 }
    );
  }

  try {
    const submissions = await db.getSubmissions();

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ success: true, exported: 0, message: 'No registrations found.' });
    }

    let exported = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send each submission to the sheet sequentially (avoid rate limits)
    for (const sub of submissions) {
      try {
        const amount = sub.participationType === 'Both' ? 50 : 30;

        const payload = {
          id:                   sub.id,
          submittedAt:          sub.submittedAt,
          teamName:             sub.teamName,
          member1Name:          sub.member1Name,
          member1Roll:          sub.member1Roll,
          member1Phone:         sub.member1Phone   || '',
          member1Email:         sub.member1Email   || '',
          member2Name:          sub.member2Name    || '',
          member2Roll:          sub.member2Roll    || '',
          branch:               sub.branch         || '',
          section:              sub.section        || '',
          participationType:    sub.participationType,
          amount,
          transactionId:        sub.transactionId  || '',
          // Don't re-send large base64 blobs for existing records — just note it exists
          paymentScreenshotUrl: sub.paymentScreenshotUrl
            ? '[Already stored in DB]'
            : 'Not provided',
          aiFlags:              sub.aiFlags        || 'None',
          status:               sub.status         || 'pending',
        };

        const res = await fetch(webhookUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        if (res.ok) {
          exported++;
        } else {
          failed++;
          errors.push(`${sub.id}: HTTP ${res.status}`);
        }

        // Small delay to avoid Apps Script rate limits (100ms between requests)
        await new Promise(r => setTimeout(r, 100));
      } catch (err: any) {
        failed++;
        errors.push(`${sub.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total:    submissions.length,
      exported,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Export to sheet failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations', details: error.message },
      { status: 500 }
    );
  }
}
