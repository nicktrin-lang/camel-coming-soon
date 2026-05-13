import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Terms of Use | Camel Global",
  description: "The terms that apply when you use the Camel Global platform to book a hire car.",
};

const EFFECTIVE_DATE  = "1 May 2026";
const COMPANY_NAME    = "NTUK Ltd (trading as Camel Global)";
const COMPANY_REG     = "08765474";
const COMPANY_ADDRESS = "Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN";

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
              When you submit a request, it&apos;s sent to verified partners within range of your pickup location.
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
            <h2 className="text-2xl font-black text-black mb-3">7. Cancellations and refunds</h2>

            <div className="bg-[#f0f0f0] px-5 py-4 mb-5">
              <p className="text-base font-black text-black mb-1">Cancellation policy summary</p>
              <p className="text-sm font-semibold text-black/70">
                The refund you receive depends on when you cancel relative to your scheduled pickup time.
                This policy is fixed and applies to all bookings on the platform.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-base font-black text-black mb-1">More than 48 hours before pickup — Full refund</p>
                <p className="text-base font-semibold text-black/70">
                  If you cancel more than 48 hours before your scheduled pickup time, you will receive a full
                  refund of everything you paid — including the car hire fee and the fuel deposit.
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-4">
                <p className="text-base font-black text-black mb-1">Within 48 hours of pickup — Partial refund</p>
                <p className="text-base font-semibold text-black/70">
                  If you cancel within 48 hours of your scheduled pickup time, the car hire fee is
                  non-refundable. The car hire company has reserved the vehicle for you and is entitled
                  to retain that fee. However, the full fuel deposit will always be refunded in full,
                  as the fuel has not been used.
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <p className="text-base font-black text-black mb-1">Once the hire has started — No refund</p>
                <p className="text-base font-semibold text-black/70">
                  Once the vehicle has been delivered and the hire is underway, cancellations are not
                  possible and no refund is available for the car hire fee. Fuel is settled based on
                  actual usage recorded at the end of the hire.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-base font-semibold">
                <strong>Partner cancellations:</strong> If the car hire company cancels your booking for any
                reason, you will receive a full refund of everything you paid, regardless of timing.
              </p>

              <p className="text-base font-semibold">
                <strong>The 48-hour threshold</strong> is measured from the scheduled pickup time recorded
                on your booking at the time of confirmation. The cancellation timestamp is recorded
                automatically by the platform at the moment you confirm the cancellation — this is the
                timestamp used to determine which tier applies.
              </p>

              <p className="text-base font-semibold">
                <strong>How to cancel:</strong> You can cancel a booking directly from your bookings page,
                provided the hire has not yet started. You do not need to contact us to cancel — the
                platform handles it automatically.
              </p>

              <p className="text-base font-semibold">
                <strong>Refunds</strong> are processed automatically and will appear in your account
                within 5–10 working days depending on your bank or card provider. You do not need to
                request a refund — it is issued automatically when you cancel.
              </p>
            </div>
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