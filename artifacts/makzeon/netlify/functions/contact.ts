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

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(payload: ContactPayload) {
  if (!payload.name || payload.name.trim().length < 2) return "Please provide a valid name.";
  if (!payload.email || !isValidEmail(payload.email)) return "Please provide a valid email address.";
  if (!payload.message || payload.message.trim().length < 10) return "Please include a message of at least 10 characters.";
  return null;
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

export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method not allowed." });
  }

  let payload: ContactPayload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { message: "Invalid JSON payload." });
  }

  const error = validate(payload);
  if (error) return json(400, { message: error });

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

      if (!resendResponse.ok) throw new Error(await resendResponse.text());
      return json(200, { ok: true });
    }

    if (CONTACT_WEBHOOK_URL) {
      const webhookResponse = await fetch(CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safePayload),
      });

      if (!webhookResponse.ok) throw new Error(await webhookResponse.text());
      return json(200, { ok: true });
    }

    return json(500, {
      message: "Contact delivery is not configured. Set RESEND_API_KEY or CONTACT_WEBHOOK_URL in the hosting environment.",
    });
  } catch (err) {
    console.error("Contact submission failed", err);
    return json(502, { message: "We could not send your message. Please email info@makzeon.com directly." });
  }
};
