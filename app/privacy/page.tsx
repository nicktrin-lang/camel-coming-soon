import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Camel Global",
  description: "How Camel Global collects, uses, and protects your personal data.",
};

const EFFECTIVE_DATE   = "1 April 2026";
const COMPANY_NAME     = "Camel Global Ltd";
const COMPANY_REG      = "XXXXXXXX"; // TODO: Replace with real registration number
const COMPANY_ADDRESS  = "123 Placeholder Street, London, EC1A 1BB, United Kingdom"; // TODO: Replace

export default function PrivacyPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="mb-3 text-4xl font-black text-white md:text-6xl">Privacy Policy</h1>
          <p className="text-white/60 text-sm font-semibold">Effective: {EFFECTIVE_DATE}</p>
        </div>
      </section>

      {/* Content */}
      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-8 text-black leading-relaxed">

          <p className="text-base font-semibold">
            This policy explains what personal data {COMPANY_NAME} collects, why we collect it, how we use it,
            and what your rights are. We&apos;ve written it in plain English — if anything isn&apos;t clear,
            use our <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
          </p>

          <hr className="border-black/10" />

          <div>
            <h2 className="text-2xl font-black text-black mb-3">1. Who we are</h2>
            <p className="text-base font-semibold">
              {COMPANY_NAME} is the operator of the Camel Global platform. We&apos;re registered in England &amp; Wales
              (company number {COMPANY_REG}) with a registered address at {COMPANY_ADDRESS}.
            </p>
            <p className="mt-3 text-base font-semibold">
              For the purposes of UK and EU data protection law, we are the data controller for the personal data
              described in this policy.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">2. What data we collect</h2>

            <div className="mt-4 bg-[#f0f0f0] px-5 py-4 mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Customers</p>
              <p className="text-base font-semibold mb-2">When you create an account or make a booking we collect:</p>
              <ul className="space-y-1 text-base font-semibold list-disc list-inside">
                <li>Your name and email address</li>
                <li>Pickup and drop-off locations (including GPS coordinates where you provide them)</li>
                <li>Booking details — dates, car type, duration</li>
                <li>Fuel usage recorded at delivery and collection</li>
                <li>Any reviews you submit</li>
                <li>Technical data — IP address, browser type, pages visited (via cookies — see our <a href="/cookies" className="text-[#ff7a00] hover:underline">Cookie Policy</a>)</li>
              </ul>
            </div>

            <div className="bg-[#f0f0f0] px-5 py-4 mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Partners (car hire companies)</p>
              <p className="text-base font-semibold mb-2">When you apply as a partner we collect:</p>
              <ul className="space-y-1 text-base font-semibold list-disc list-inside">
                <li>Business name, legal company name, and registration number</li>
                <li>VAT / NIF number</li>
                <li>Fleet base address and GPS coordinates</li>
                <li>Contact email address</li>
                <li>Driver names and contact details you add to your account</li>
                <li>Fleet vehicle details</li>
                <li>Booking and financial data related to your account</li>
              </ul>
            </div>

            <div className="bg-[#f0f0f0] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Drivers</p>
              <p className="text-base font-semibold">
                Driver accounts are created by partners. We collect the name and login email you&apos;re given, along
                with job confirmation records linked to the bookings you complete.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">3. Why we collect it</h2>
            <p className="text-base font-semibold mb-2">We use your data to:</p>
            <ul className="space-y-1 text-base font-semibold list-disc list-inside">
              <li>Process and manage your bookings</li>
              <li>Match customer requests with nearby partners</li>
              <li>Send booking confirmations and status updates by email</li>
              <li>Calculate fuel charges and partner payouts</li>
              <li>Display reviews and ratings on partner profiles</li>
              <li>Improve and maintain the platform</li>
              <li>Comply with our legal obligations (e.g. financial record-keeping)</li>
            </ul>
            <p className="mt-3 text-base font-semibold">
              Our legal basis is primarily <strong>contract performance</strong> (we need your data to deliver the
              service you signed up for) and <strong>legitimate interests</strong> (maintaining and improving the platform).
              Where we rely on your consent (e.g. analytics cookies), you can withdraw it at any time.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">4. Who we share your data with</h2>
            <p className="text-base font-semibold mb-2">We don&apos;t sell your data. We share it only where necessary to run the service:</p>
            <ul className="space-y-1 text-base font-semibold list-disc list-inside">
              <li><strong>Partners</strong> — when you accept a bid, the partner receives your pickup/drop-off location and booking details to fulfil the hire</li>
              <li><strong>Supabase</strong> — our database and authentication provider (data stored in the EU)</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
              <li><strong>Google Maps</strong> — location search and mapping (subject to Google&apos;s privacy policy)</li>
              <li><strong>Stripe</strong> — payment processing (when integrated)</li>
              <li><strong>Vercel</strong> — hosting and infrastructure</li>
              <li><strong>Google Analytics</strong> — aggregate site usage analytics (only if you accept analytics cookies)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">5. How long we keep your data</h2>
            <p className="text-base font-semibold">
              We keep your account and booking data for as long as your account is active and for a reasonable
              period afterwards to comply with legal and financial obligations (typically 7 years for financial records).
            </p>
            <p className="mt-3 text-base font-semibold">
              If you delete your account, we immediately remove your ability to log in and flag your profile as deleted.
              Your booking and financial records are retained for the period required by law, then deleted.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">6. Your rights</h2>
            <p className="text-base font-semibold mb-2">Under UK GDPR you have the right to:</p>
            <ul className="space-y-1 text-base font-semibold list-disc list-inside">
              <li><strong>Access</strong> — request a copy of the data we hold about you</li>
              <li><strong>Correction</strong> — ask us to fix inaccurate data</li>
              <li><strong>Erasure</strong> — ask us to delete your data (subject to legal retention obligations)</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong>Objection</strong> — object to processing based on legitimate interests</li>
              <li><strong>Withdrawal of consent</strong> — withdraw cookie consent at any time via the banner</li>
            </ul>
            <p className="mt-3 text-base font-semibold">
              To exercise any of these rights, use our{" "}
              <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
              We&apos;ll respond within 30 days. You also have the right to complain to the ICO (ico.org.uk) if you
              believe we&apos;ve mishandled your data.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">7. Cookies</h2>
            <p className="text-base font-semibold">
              We use cookies for essential site functionality and, with your consent, for analytics.
              See our <a href="/cookies" className="text-[#ff7a00] hover:underline">Cookie Policy</a> for full details.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">8. Security</h2>
            <p className="text-base font-semibold">
              We use industry-standard security measures including encrypted connections (HTTPS), row-level database
              security, rate limiting on all authentication endpoints, and CAPTCHA on all sign-in and sign-up forms.
              No system is completely immune to attack, but we take reasonable precautions to protect your data.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">9. Changes to this policy</h2>
            <p className="text-base font-semibold">
              We may update this policy from time to time. When we do, we&apos;ll update the effective date at the top.
              If changes are significant, we&apos;ll notify you by email.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">10. Contact</h2>
            <p className="text-base font-semibold">
              Questions? Use our{" "}
              <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}