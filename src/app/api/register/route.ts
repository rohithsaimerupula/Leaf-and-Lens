import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const submission = await req.json();

    if (!submission || !submission.id || !submission.member1Email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Save to Database
    await db.saveSubmission(submission);

    // 2. Push key fields to Google Sheet (fire-and-forget, never blocks submission)
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (webhookUrl) {
      const amount = submission.participationType === 'Both' ? 50 : 30;

      const sheetPayload = {
        id:                   submission.id,
        submittedAt:          submission.submittedAt,
        teamName:             submission.teamName,
        member1Name:          submission.member1Name,
        member1Roll:          submission.member1Roll,
        member1Phone:         submission.member1Phone,
        member1Email:         submission.member1Email,
        member2Name:          submission.member2Name  || '',
        member2Roll:          submission.member2Roll  || '',
        branch:               submission.branch,
        section:              submission.section,
        participationType:    submission.participationType,
        amount,
        transactionId:        submission.transactionId,
        paymentScreenshotUrl: submission.paymentScreenshotUrl || null,
        aiFlags:              submission.aiFlags || null,
        status:               submission.status || 'pending',
      };

      // Detach from main request — don't await, don't let it fail the response
      fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sheetPayload),
      }).catch(err => console.error('[GoogleSheet] Webhook failed:', err));
    }

    // 3. Send Confirmation Email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = '🎉 Registration Received - Leaf & Lens 2026';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #c9a84c;">Registration Received!</h2>
        <p>Hi <strong>${submission.member1Name || 'Participant'}</strong>,</p>
        <p>Your registration for the <strong>Leaf &amp; Lens 2026</strong> competition (ID: ${submission.id}) has been successfully received.</p>
        <table style="border-collapse:collapse;width:100%;margin:1rem 0;font-size:0.9rem;">
          <tr style="background:#f7f3ec"><td style="padding:8px 12px;font-weight:600">Team</td><td style="padding:8px 12px">${submission.teamName || '—'}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600">Category</td><td style="padding:8px 12px">${submission.participationType}</td></tr>
          <tr style="background:#f7f3ec"><td style="padding:8px 12px;font-weight:600">Amount Paid</td><td style="padding:8px 12px">₹${submission.participationType === 'Both' ? 50 : 30}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600">UTR Number</td><td style="padding:8px 12px">${submission.transactionId || '—'}</td></tr>
        </table>
        <p>Your submission is currently <strong>pending review</strong>. You will receive another email once reviewed.</p>
        <p>You can check your status anytime at the portal.</p>
        <br/>
        <p>Best regards,<br/>The Leaf &amp; Lens Team (BS&amp;H Dept, VIIT)</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      submission.member1Email,
        subject,
        html:    htmlContent,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error: any) {
    console.error('Error saving registration:', error);
    return NextResponse.json(
      { error: 'Failed to process registration', details: error.message },
      { status: 500 }
    );
  }
}
