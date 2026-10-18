import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendOtpEmail(to: string, name: string, code: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const text = [
    `Hello ${name},`,
    ``,
    `Your ACSES Elections activation code is: ${code}`,
    ``,
    `It expires in 10 minutes. Use it at ${appUrl}/activate to set your password and activate your voting account.`,
    ``,
    `If you did not request this, ignore this email.`,
    `-- ACSES Electoral Committee`,
  ].join("\n");

  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST must be configured to send activation emails in production.");
    }
    console.log(`\n[DEV EMAIL] OTP for ${to}: ${code}\n`);
    return;
  }
  await t.sendMail({
    from: process.env.SMTP_FROM || "ACSES Elections <no-reply@acses.org>",
    to,
    subject: "Your ACSES Elections activation code",
    text,
  });
}
