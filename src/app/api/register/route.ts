import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const submission = await req.json();

    if (!submission || !submission.id || !submission.member1Email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Save to Database
    await db.saveSubmission(submission);

    // 2. Send Confirmation Email
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
        <p>Your registration for the <strong>Leaf & Lens 2026</strong> competition (ID: ${submission.id}) has been successfully received.</p>
        <p>Your submission is currently <strong>pending review</strong>. You will receive another email once your submission has been reviewed by the admin.</p>
        <p>You can check your status at any time by visiting the portal.</p>
        <br/>
        <p>Best regards,<br/>The Leaf & Lens Team (BS&H Dept, VIIT)</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: submission.member1Email,
      subject,
      html: htmlContent,
    };

    // We don't want the email failing to crash the submission response if DB saved successfully
    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error: any) {
    console.error('Error saving registration:', error);
    return NextResponse.json({ error: 'Failed to process registration', details: error.message }, { status: 500 });
  }
}
