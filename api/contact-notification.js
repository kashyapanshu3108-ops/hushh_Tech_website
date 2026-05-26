import nodemailer from "nodemailer";

const CONTACT_RECIPIENTS = [
  "ankit@hushh.ai",
  "manish@hushh.ai",
  "kushal@hushh.ai",
  "jhumma@hushh.ai",
];

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeText = (value, maxLength) =>
  String(value || "").trim().slice(0, maxLength);

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const buildContactHtml = ({
  name,
  email,
  company,
  phone,
  reason,
  message,
  sourcePath,
}) => {
  const submittedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles",
  });

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#111827;">
      <h2 style="margin:0 0 16px;color:#0A84FF;">New HushhTech contact request</h2>
      <p style="margin:0 0 24px;color:#4B5563;">A visitor submitted the public HushhTech contact form.</p>
      <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:8px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:8px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:8px 0;"><strong>Company:</strong> ${escapeHtml(company || "Not provided")}</p>
        <p style="margin:8px 0;"><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
        <p style="margin:8px 0;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
        <p style="margin:8px 0;"><strong>Submitted:</strong> ${escapeHtml(submittedAt)} PST</p>
        <p style="margin:8px 0;"><strong>Source:</strong> ${escapeHtml(sourcePath || "/contact")}</p>
      </div>
      <div style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;padding:20px;white-space:pre-wrap;line-height:1.6;">
        ${escapeHtml(message)}
      </div>
    </div>
  `;
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const name = normalizeText(req.body?.name, 120);
  const email = normalizeText(req.body?.email, 160);
  const company = normalizeText(req.body?.company, 160);
  const phone = normalizeText(req.body?.phone, 80);
  const reason = normalizeText(req.body?.reason, 160);
  const message = normalizeText(req.body?.message, 5000);
  const website = normalizeText(req.body?.website, 200);
  const sourcePath = normalizeText(req.body?.sourcePath, 200);

  if (website) {
    return res.status(200).json({ success: true, spamIgnored: true });
  }

  if (!name || !email || !reason || !message) {
    return res.status(400).json({ error: "Missing required contact fields" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(503).json({ error: "Contact email is not configured" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const subject = `[HushhTech Contact] ${reason} — ${name}`;
    const html = buildContactHtml({
      name,
      email,
      company,
      phone,
      reason,
      message,
      sourcePath,
    });

    const result = await transporter.sendMail({
      from: `"Hushh Contact" <${process.env.GMAIL_USER}>`,
      replyTo: email,
      to: CONTACT_RECIPIENTS.join(","),
      subject,
      html,
    });

    return res.status(200).json({
      success: true,
      emailSent: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Contact email error:", error);
    return res.status(500).json({ error: "Failed to send contact email" });
  }
}
