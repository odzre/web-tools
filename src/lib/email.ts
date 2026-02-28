import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  try {
    // In development, just log the OTP
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
      console.log(`\n========================================`);
      console.log(`📧 OTP for ${to}: ${otp}`);
      console.log(`========================================\n`);
      return true;
    }

    await transporter.sendMail({
      from: `"MyCash Payment" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Kode Verifikasi OTP - MyCash',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #38bdf8; font-size: 28px; margin: 0;">MyCash</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Payment Gateway</p>
          </div>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; text-align: center;">
            <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 16px;">Kode verifikasi Anda:</p>
            <div style="background: rgba(56,189,248,0.1); border: 2px dashed #38bdf8; border-radius: 8px; padding: 16px; display: inline-block;">
              <span style="color: #38bdf8; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">Kode ini berlaku selama <strong style="color: #f0abfc;">5 menit</strong>.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 8px;">Jangan bagikan kode ini kepada siapapun.</p>
          </div>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // Fallback: log to console
    console.log(`\n========================================`);
    console.log(`📧 OTP for ${to}: ${otp} (email failed, using console)`);
    console.log(`========================================\n`);
    return true;
  }
}
