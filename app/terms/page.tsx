import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Terms of Use | Camel Global",
  description: "The terms that apply when you use the Camel Global platform to book a hire car.",
};

const EFFECTIVE_DATE  = "1 April 2026";
const COMPANY_NAME    = "Camel Global Ltd";
const COMPANY_REG     = "XXXXXXXX"; // TODO: Replace with real registration number
const COMPANY_ADDRESS = "123 Placeholder Street, London, EC1A 1BB, United Kingdom"; // TODO: Replace

export default function CustomerTermsPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="mb-3 text-4xl font-black text-white md:text-6xl">Customer Terms of Use</h1>
          <p className="text-white/60 text-sm font-semibold">Effective: {EFFECTIVE_DATE}</p>
        </div>
      </section>

      {/* Content */}
      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-8 text-black leading-relaxed">

          <p className="text-base font-semibold">
            These terms apply when you use the Camel Global platform as a customer to request and book a
            hire car. Please read them — they explain how the platform works, what we&apos;re responsible for,
            and what we&apos;re not. If anything isn&apos;t clear, use our{" "}
            <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
          </p>

          <hr className="border-black/10" />

          <div>
            <h2 className="text-2xl font-black text-black mb-3">1. Who we are</h2>
            <p className="text-base font-semibold">
              {COMPANY_NAME} (&quot;Camel&quot;, &quot;we&quot;, &quot;us&quot;) is registered in England &amp; Wales
              (company number {COMPANY_REG}), registered address {COMPANY_ADDRESS}.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">2. What Camel Global actually is</h2>
            <div className="bg-[#f0f0f0] px-5 py-4 mb-4">
              <p className="text-base font-black text-black">
                Camel Global is a platform intermediary, not a car hire company.
              </p>
            </div>
            <p className="text-base font-semibold mb-3">
              When you accept a bid and confirm a booking, you are entering into a car hire contract directly
              with the partner (the car hire company). Camel Global facilitates that transaction — we connect
              you with available partners, process the booking, and manage the job from request to completion —
              but the rental agreement is between you and the partner.
            </p>
            <p className="text-base font-semibold">
              This means the partner is responsible for the condition of the vehicle, the insurance,
              and the fulfilment of your hire. Camel Global is responsible for the platform and the
              booking process described in these terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">3. Creating an account</h2>
            <p className="text-base font-semibold mb-3">
              You need to create an account to make a booking. You must provide accurate information and
              keep your login details secure. You&apos;re responsible for any activity on your account.
            </p>
            <p className="text-base font-semibold">
              You must be 18 or over to create an account. By registering you confirm this.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">4. Making a booking</h2>
            <p className="text-base font-semibold mb-3">
              When you submit a request, it&apos;s sent to verified partners within 30km of your pickup location.
              Partners may or may not place a bid — we can&apos;t guarantee that any specific partner or number
              of partners will respond.
            </p>
            <p className="text-base font-semibold mb-3">
              When you accept a bid, your booking is confirmed. At that point, a contract is formed between
              you and the partner for the hire of that vehicle on the agreed terms. Camel Global is not a
              party to that contract.
            </p>
            <p className="text-base font-semibold">
              You&apos;ll receive a confirmation by email. Please check the details carefully and contact us
              immediately if anything looks wrong.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">5. Fuel charges</h2>
            <p className="text-base font-semibold mb-3">
              Fuel is recorded by the driver at delivery and again at collection. You are charged only for
              the fuel you have used during your hire, rounded to the nearest quarter tank. The partner
              sets the fuel rate, which is shown clearly before you accept a bid.
            </p>
            <p className="text-base font-semibold">
              Both you and the driver independently confirm the fuel level at each stage. If you disagree
              with a recorded reading, contact us within 48 hours of collection.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">6. Payments</h2>
            <p className="text-base font-semibold mb-3">
              The hire price shown in the bid is the price you pay (plus any fuel charge calculated at
              the end of the hire). All prices shown include any applicable taxes unless otherwise stated.
            </p>
            <p className="text-base font-semibold">
              Payments are processed securely. Camel Global collects payment on behalf of the partner.
              Your payment to Camel Global satisfies your obligation to pay the partner.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">7. Cancellations</h2>
            <p className="text-base font-semibold mb-3">
              Cancellation terms vary by partner and are shown at the time of booking. Camel Global
              will apply those terms when processing any cancellation or refund request.
            </p>
            <p className="text-base font-semibold">
              To cancel a booking, use the platform or use our{" "}
              <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">8. Insurance and your responsibilities</h2>
            <p className="text-base font-semibold mb-3">
              Every vehicle delivered through Camel Global is covered by insurance arranged by the
              partner. Insurance documents are confirmed on handover — you&apos;ll be asked to confirm
              receipt on the platform before driving away.
            </p>
            <p className="text-base font-semibold mb-3">
              You are responsible for driving the vehicle legally — with a valid licence, within the
              terms of the insurance, and in accordance with local road laws. Any damage, fines, or
              liabilities incurred during the hire are your responsibility unless caused by a fault
              with the vehicle.
            </p>
            <p className="text-base font-semibold">
              Camel Global does not provide insurance and is not liable for incidents arising during
              the hire period.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">9. Our liability</h2>
            <p className="text-base font-semibold mb-2">Camel Global is a platform intermediary. We are responsible for:</p>
            <ul className="list-disc list-inside text-base font-semibold space-y-1 mb-4">
              <li>Operating the platform and booking system</li>
              <li>Verifying that partners have completed our onboarding process</li>
              <li>Processing your payment correctly</li>
              <li>Communicating booking details accurately</li>
            </ul>
            <p className="text-base font-semibold mb-2">We are not responsible for:</p>
            <ul className="list-disc list-inside text-base font-semibold space-y-1 mb-4">
              <li>The condition or suitability of the vehicle provided by the partner</li>
              <li>A partner failing to deliver or collect as agreed</li>
              <li>Incidents, accidents, damage, or loss during the hire period</li>
              <li>Delays caused by circumstances outside our control</li>
            </ul>
            <p className="text-base font-semibold">
              Nothing in these terms limits our liability for death or personal injury caused by our
              negligence, fraud, or anything else that cannot be excluded by law.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">10. Reviews</h2>
            <p className="text-base font-semibold">
              After a booking completes, you may be invited to leave a review of the partner. Reviews
              must be honest and based on your actual experience. We reserve the right to remove reviews
              that are abusive, false, or in breach of these terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">11. Your account and data</h2>
            <p className="text-base font-semibold">
              You can delete your account at any time from your settings page. We&apos;ll remove your login
              access immediately. Booking and financial records are retained as required by law.
              See our <a href="/privacy" className="text-[#ff7a00] hover:underline">Privacy Policy</a> for full details.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">12. Changes to these terms</h2>
            <p className="text-base font-semibold">
              We may update these terms from time to time. The version in force when you made your
              booking applies to that booking. For future bookings, the current version applies.
              We&apos;ll notify you of significant changes by email.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">13. Governing law</h2>
            <p className="text-base font-semibold">
              These terms are governed by the laws of England and Wales. Any disputes will be subject
              to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">14. Contact</h2>
            <p className="text-base font-semibold">
              Questions or complaints? Use our{" "}
              <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}