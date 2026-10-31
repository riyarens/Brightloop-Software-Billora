import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: SendEmailOptions): Promise<boolean> => {
  try {
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(`📧 Email sent to ${to}: MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`⚠️ Failed to send email to ${to}:`, error);
    // In dev / test, we do not throw to allow offline execution
    return false;
  }
};

export const sendPasswordResetEmail = async (email: string, rawToken: string): Promise<boolean> => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}`;
  const subject = 'BILLORA - Password Reset Request';
  const text = `You requested a password reset for your BILLORA account.\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link will expire in 30 minutes.\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">BILLORA Subscription Management</h2>
      <p>Hello,</p>
      <p>You requested a password reset for your account. Click the button below to set a new password:</p>
      <div style="margin: 24px 0;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">This link will expire in 30 minutes.</p>
      <p style="color: #64748b; font-size: 14px;">If you did not request a password reset, no action is needed.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">Brightloop Software – BILLORA</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

