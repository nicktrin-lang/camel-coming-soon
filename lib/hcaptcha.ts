/**
 * Server-side hCaptcha token verification.
 * Call this in any API route before processing the request.
 */
export async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("HCAPTCHA_SECRET_KEY is not set");
    return false;
  }

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.error("hCaptcha verification failed:", e);
    return false;
  }
}