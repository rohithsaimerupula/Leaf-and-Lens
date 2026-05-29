import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, name, status, reason, id } = await req.json();

    if (!email || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let subject = '';
    let statusMessage = '';
    let color = '';

    if (status === 'approved') {
      subject = '✅ Registration Approved - Leaf & Lens 2026';
      statusMessage = 'Great news! Your registration has been <strong>Approved</strong>. You are officially part of the competition.';
      color = '#52b788';
    } else if (status === 'rejected') {
      subject = '❌ Registration Update - Leaf & Lens 2026';
      statusMessage = 'Unfortunately, your registration has been <strong>Rejected</strong>.';
      color = '#e63946';
    } else if (status === 'removed') {
      subject = '⚠️ Registration Removed - Leaf & Lens 2026';
      statusMessage = 'Your registration has been <strong>Removed</strong> from the competition.';
      color = '#f4a261';
    } else {
      return NextResponse.json({ success: true, ignored: true });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: ${color};">${subject.split('-')[0]}</h2>
        <p>Hi <strong>${name || 'Participant'}</strong>,</p>
        <p>${statusMessage}</p>
        ${reason ? `<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid ${color}; border-radius: 4px;"><p style="margin: 0; font-size: 14px;"><strong>Admin Note / Reason:</strong><br/>${reason}</p></div>` : ''}
        <p>If you have any questions or believe this was a mistake, please contact the coordinators.</p>
        <br/>
        <p>Best regards,<br/>The Leaf & Lens Team (BS&H Dept, VIIT)</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending status email:', error);
    return NextResponse.json({ error: 'Failed to send email', details: error.message }, { status: 500 });
  }
}
