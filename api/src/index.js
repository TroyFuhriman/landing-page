const { app } = require("@azure/functions");

const MAILERSEND_API = "https://api.mailersend.com/v1/email";

app.http("sendContact", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    if (request.method === "OPTIONS") {
      return {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      };
    }

    const apiKey = process.env.MAILERSEND_API_KEY;
    const fromEmail = process.env.MAILERSEND_FROM_EMAIL;
    const fromName = process.env.MAILERSEND_FROM_NAME || "Troy Fuhriman";
    const toEmail = process.env.MAILERSEND_TO_EMAIL;
    const templateId = process.env.MAILERSEND_TEMPLATE_ID
      ? process.env.MAILERSEND_TEMPLATE_ID.trim()
      : "";

    if (!apiKey || !fromEmail || !toEmail) {
      context.log.warn(
        "MailerSend config missing: set MAILERSEND_API_KEY, MAILERSEND_FROM_EMAIL, MAILERSEND_TO_EMAIL in Azure app settings.",
      );
      return {
        status: 503,
        headers,
        body: JSON.stringify({ error: "Contact form is not configured." }),
      };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON body." }),
      };
    }

    // Honeypot: if "company" is filled, treat as bot — return success without sending
    if (body.company && String(body.company).trim() !== "") {
      return {
        status: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    const name = (body.from_name || body.name || "").trim();
    const replyTo = (body.reply_to || body.email || "").trim();
    const message = (body.message || "").trim();
    const projectType = (body.project_type || "").trim();
    const budget = (body.budget || "").trim();

    if (!name || !replyTo || !message) {
      return {
        status: 400,
        headers,
        body: JSON.stringify({
          error: "Missing required fields: from_name, reply_to, message.",
        }),
      };
    }

    const subject = `Contact from ${name} (troykfuhriman.com)`;
    const textBody = `Name: ${name}\nEmail: ${replyTo}\n\n${message}`;
    const htmlBody = `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> <a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a></p><pre>${escapeHtml(message)}</pre>`;

    let mailersendBody;

    if (templateId) {
      mailersendBody = {
        from: { email: fromEmail, name: fromName },
        to: [{ email: toEmail, name: "Troy Fuhriman" }],
        reply_to: { email: replyTo, name },
        subject,

        template_id: templateId,
        personalization: [
          {
            email: toEmail,
            data: {
              name,
              email: replyTo,
              message,
              project_type: projectType || "—",
              budget: budget || "—",
            },
          },
        ],
      };
    } else {
      mailersendBody = {
        from: { email: fromEmail, name: fromName },
        to: [{ email: toEmail, name: "Troy Fuhriman" }],
        reply_to: { email: replyTo, name },
        subject,
        text: textBody,
        html: htmlBody,
      };
    }

    try {
      const res = await fetch(MAILERSEND_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(mailersendBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        context.log.error("MailerSend error:", res.status, errText);
        return {
          status: 502,
          headers,
          body: JSON.stringify({
            error: "Failed to send email. Please try again or email directly.",
          }),
        };
      }

      return {
        status: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      context.log.error("Send failed:", err);
      return {
        status: 500,
        headers,
        body: JSON.stringify({
          error: "Server error. Please try again later.",
        }),
      };
    }
  },
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
