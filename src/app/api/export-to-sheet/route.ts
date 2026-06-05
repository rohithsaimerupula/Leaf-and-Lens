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

    const payloads = submissions.map(sub => {
      const amount = sub.participationType === 'Both' ? 50 : 30;
      return {
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
        paymentScreenshotUrl: sub.paymentScreenshotUrl
          ? (sub.paymentScreenshotUrl.startsWith('data:image') ? '[Base64 Image Stored in DB]' : sub.paymentScreenshotUrl)
          : 'Not provided',
        aiFlags:              sub.aiFlags        || 'None',
        status:               sub.status         || 'pending',
      };
    });

    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payloads),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Google Sheets webhook returned HTTP ${res.status}`, details: text.substring(0, 200) },
        { status: res.status }
      );
    }

    const result = await res.json();
    if (!result.success) {
      return NextResponse.json(
        { error: 'Google Sheets script execution failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total:    submissions.length,
      exported: result.count || submissions.length,
      failed:   0,
    });
  } catch (error: any) {
    console.error('Export to sheet failed:', error);
    return NextResponse.json(
      { error: 'Failed to sync registrations', details: error.message },
      { status: 500 }
    );
  }
}
