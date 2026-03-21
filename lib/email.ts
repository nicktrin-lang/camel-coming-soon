export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

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
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Resend failed:", res.status, text);
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  console.log("✅ Email sent:", json?.id || json);

  return json;
}

/* =========================================
   1. APPLICATION RECEIVED
========================================= */
export async function sendApplicationReceivedEmail(to: string) {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  return sendEmail({
    to,
    subject: "Your Camel Global application has been received",
    html: `
      <div style="font-family: system-ui;">
        <h2>Application received</h2>
        <p>Thanks for applying to become a Camel Global partner.</p>
        <p>Our team will review your application shortly.</p>
        <p>No action is required at this stage.</p>
        <p style="margin-top:20px;">
          <a href="${baseUrl}/partner/login">Login to portal</a>
        </p>
      </div>
    `,
  });
}

/* =========================================
   2. APPROVED (NOT LIVE)
========================================= */
export async function sendApprovalEmail(to: string) {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  return sendEmail({
    to,
    subject: "Your Camel Global account has been approved",
    html: `
      <div style="font-family: system-ui;">
        <h2>You're approved ✅</h2>
        <p>Your account has been approved.</p>
        
        <p><strong>Important:</strong> You are not live yet.</p>

        <p>Please complete the following:</p>
        <ul>
          <li>Add your car fleet</li>
          <li>Confirm your fleet base address</li>
          <li>Check your service radius</li>
        </ul>

        <p>
          <a href="${baseUrl}/partner/login">Login to complete setup</a>
        </p>
      </div>
    `,
  });
}

/* =========================================
   3. ACCOUNT LIVE
========================================= */
export async function sendAccountLiveEmail(to: string) {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  return sendEmail({
    to,
    subject: "Your Camel Global account is now live 🚀",
    html: `
      <div style="font-family: system-ui;">
        <h2>Your account is now live 🚀</h2>

        <p>You can now start receiving bookings.</p>

        <p>Make sure:</p>
        <ul>
          <li>Your fleet is up to date</li>
          <li>Your availability is correct</li>
          <li>Your service radius is accurate</li>
        </ul>

        <p>
          <a href="${baseUrl}/partner/dashboard">Go to dashboard</a>
        </p>
      </div>
    `,
  });
}