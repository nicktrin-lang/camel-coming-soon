export async function sendApprovalEmail(to: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  console.log("📧 Attempting to send approval email to:", to);

  if (!apiKey) {
    console.error("❌ Missing RESEND_API_KEY");
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!from) {
    console.error("❌ Missing EMAIL_FROM");
    throw new Error("Missing EMAIL_FROM");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your Camel partner account is approved ✅",
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;">
          <h2>You're approved ✅</h2>
          <p>Your partner account has been approved. You can now log in and access the partner dashboard.</p>
          <p>
            <a href="${baseUrl}/partner/login">
              Log in here
            </a>
          </p>
          <p style="color:#666;font-size:13px;margin-top:24px;">Camel Global</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Resend failed:", res.status, text);
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  console.log("✅ Approval email sent successfully:", json?.id || json);

  return json;
}