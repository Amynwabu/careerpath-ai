import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

type ContactPayload = {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  message?: string;
  source?: string;
  submittedAt?: string;
};

const CONTACT_TO = process.env.CONTACT_TO || "info@makzeon.com";
const CONTACT_FROM = process.env.CONTACT_FROM || "MakZeon Website <leads@makzeon.com>";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_WEBHOOK_URL = process.env.CONTACT_WEBHOOK_URL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(payload: ContactPayload) {
  if (!payload.name || payload.name.trim().length < 2) return "Please provide a valid name.";
  if (!payload.email || !isValidEmail(payload.email)) return "Please provide a valid email address.";
  if (!payload.message || payload.message.trim().length < 10) return "Please include a message of at least 10 characters.";
  return null;
}

function hasSmtpConfig() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

async function sendViaSmtp(payload: Required<Pick<ContactPayload, "name" | "email" | "message">> & ContactPayload) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: CONTACT_FROM,
    to: CONTACT_TO,
    replyTo: payload.email,
    subject: `New MakZeon enquiry from ${payload.name}`,
    text: textBody(payload),
  });
}

function textBody(payload: Required<Pick<ContactPayload, "name" | "email" | "message">> & ContactPayload) {
  return [
    "New MakZeon website enquiry",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Company: ${payload.company || "Not supplied"}`,
    `Phone: ${payload.phone || "Not supplied"}`,
    `Source: ${payload.source || "makzeon-website"}`,
    `Submitted: ${payload.submittedAt || new Date().toISOString()}`,
    "",
    "Message:",
    payload.message,
  ].join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed." });
  }

  const payload = (req.body || {}) as ContactPayload;
  const error = validate(payload);
  if (error) return res.status(400).json({ message: error });

  const safePayload = {
    name: payload.name!.trim(),
    email: payload.email!.trim(),
    company: payload.company?.trim() || "",
    phone: payload.phone?.trim() || "",
    message: payload.message!.trim(),
    source: payload.source || "makzeon-website",
    submittedAt: payload.submittedAt || new Date().toISOString(),
  };

  try {
    if (hasSmtpConfig()) {
      await sendViaSmtp(safePayload);
      return res.status(200).json({ ok: true });
    }

    if (RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: CONTACT_FROM,
          to: CONTACT_TO,
          reply_to: safePayload.email,
          subject: `New MakZeon enquiry from ${safePayload.name}`,
          text: textBody(safePayload),
        }),
      });

      if (!resendResponse.ok) {
        const details = await resendResponse.text();
        throw new Error(`Resend failed: ${details}`);
      }

      return res.status(200).json({ ok: true });
    }

    if (CONTACT_WEBHOOK_URL) {
      const webhookResponse = await fetch(CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safePayload),
      });

      if (!webhookResponse.ok) {
        const details = await webhookResponse.text();
        throw new Error(`Webhook failed: ${details}`);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(500).json({
      message:
        "Contact delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, RESEND_API_KEY, or CONTACT_WEBHOOK_URL in the hosting environment.",
    });
  } catch (err) {
    console.error("Contact submission failed", err);
    return res.status(502).json({
      message: "We could not send your message. Please email info@makzeon.com directly.",
    });
  }
}
