import { logger } from "./logger";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:5173"
  ).replace(/\/+$/, "");
}

export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() ?? "CareerPath AI <noreply@careerpath.local>";

  if (!resendApiKey) {
    logger.info(
      { to: message.to, subject: message.subject, text: message.text },
      "Email provider is not configured; logging transactional email instead",
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to send email through Resend (${response.status}): ${body}`);
  }
}

export function resetPasswordEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: "Reset your CareerPath AI password",
    text: `Use this link to reset your password. It expires in 1 hour: ${link}`,
    html: `<p>Use this link to reset your password. It expires in 1 hour.</p><p><a href="${link}">Reset password</a></p>`,
  };
}

export function verifyEmailMessage(to: string, link: string): EmailMessage {
  return {
    to,
    subject: "Verify your CareerPath AI email",
    text: `Use this link to verify your email address: ${link}`,
    html: `<p>Use this link to verify your email address.</p><p><a href="${link}">Verify email</a></p>`,
  };
}
