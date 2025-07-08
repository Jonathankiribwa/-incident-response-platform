import nodemailer from 'nodemailer';

const SMTP_HOST = process.env['SMTP_HOST'];
const SMTP_PORT = process.env['SMTP_PORT'];
const SMTP_USER = process.env['SMTP_USER'];
const SMTP_PASS = process.env['SMTP_PASS'];
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'noreply@example.com';

let transporter: nodemailer.Transporter | null = null;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });
} 