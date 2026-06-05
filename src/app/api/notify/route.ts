import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, name, status, id } = await req.json();

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
    let htmlContent = '';

    if (status === 'approved') {
      subject = '🎉 Registration Approved - Leaf & Lens';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #10b981;">Registration Approved!</h2>
          <p>Hi <strong>${name || 'Participant'}</strong>,</p>
          <p>Great news! Your registration for <strong>Leaf & Lens</strong> (ID: ${id}) has been <strong>approved</strong>.</p>
          <p>We have successfully verified your PhonePe payment.</p>
          <p>Get ready for the event. If you have any questions, feel free to reply to this email or contact the student coordinators.</p>
          <br/>
          <p>Best regards,<br/>The Leaf & Lens Team (BS&H Dept, VIIT)</p>
        </div>
      `;
    } else if (status === 'rejected') {
      subject = '❌ Registration Rejected - Leaf & Lens';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #ef4444;">Registration Update</h2>
          <p>Hi <strong>${name || 'Participant'}</strong>,</p>
          <p>Unfortunately, your registration for <strong>Leaf & Lens</strong> (ID: ${id}) has been <strong>rejected</strong>.</p>
          <p>This is usually because the payment screenshot or UTR number could not be verified by the Accounts department, or your submission did not meet the guidelines.</p>
          <p>If you believe this is a mistake, please contact the student coordinators immediately.</p>
          <br/>
          <p>Best regards,<br/>The Leaf & Lens Team (BS&H Dept, VIIT)</p>
        </div>
      `;
    } else if (status === 'deleted') {
       subject = '🗑️ Registration Cancelled - Leaf & Lens';
       htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #64748b;">Registration Cancelled</h2>
          <p>Hi <strong>${name || 'Participant'}</strong>,</p>
          <p>Your registration for <strong>Leaf & Lens</strong> (ID: ${id}) has been deleted from our system by an administrator.</p>
          <br/>
          <p>Best regards,<br/>The Leaf & Lens Team (BS&H Dept, VIIT)</p>
        </div>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email', details: error.message }, { status: 500 });
  }
}
