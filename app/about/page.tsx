import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Camel Global",
  description: "Learn about Camel Global — the meet & greet car hire platform connecting customers with trusted local car hire partners.",
};

export default function AboutPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <section className="w-full bg-gradient-to-br from-[#003768] to-[#005b9f] px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#ff7a00]">About Camel Global</p>
          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">
            Car hire that comes to you.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-white/80">
            We built Camel Global because picking up a hire car shouldn&apos;t mean queuing at an airport desk or
            taking a bus to an off-site depot. Your car should be waiting for you — exactly where you need it,
            exactly when you need it.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold text-[#003768]">What we do</h2>
          <p className="mb-5 text-[#334155] leading-relaxed">
            Camel Global is a meet &amp; greet car hire platform — think of it like Uber, but for car hire.
            Instead of you going to the car, a driver from a trusted local car hire company delivers it directly
            to your chosen location: your hotel, your home, the airport arrivals hall, wherever works for you.
          </p>
          <p className="mb-5 text-[#334155] leading-relaxed">
            You tell us where you need a car, when, and for how long. We send your request to verified car hire
            partners within 30km of your pickup point. They compete for your business by placing bids. You pick
            the offer that suits you — on price, on car type, on rating — and the booking is confirmed instantly.
          </p>
          <p className="text-[#334155] leading-relaxed">
            At the end of your hire, the driver collects the car from wherever you are. You only pay for the
            fuel you&apos;ve actually used, calculated to the nearest quarter tank. No surprises, no hidden charges.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full bg-[#e3f4ff] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-2xl font-bold text-[#003768]">How it works</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { n: "01", title: "Submit a request", body: "Tell us your pickup location, drop-off point, dates, and the type of car you need. It takes about two minutes." },
              { n: "02", title: "Receive bids", body: "Verified local car hire partners near you see your request and place bids. You get to compare them side by side." },
              { n: "03", title: "Accept an offer", body: "Choose the bid that works for you. The booking is confirmed immediately and the partner is notified." },
              { n: "04", title: "Car delivered to you", body: "A driver delivers your car to your chosen location at the agreed time. Insurance documents are confirmed on handover." },
              { n: "05", title: "Drive", body: "Enjoy your hire. When you're done, let us know where you'll be and a driver will come and collect the car." },
              { n: "06", title: "Pay only for fuel used", body: "Fuel is recorded at delivery and collection. You pay only for what you've used, rounded to the nearest quarter tank." },
            ].map(({ n, title, body }) => (
              <div key={n} className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="mb-2 text-3xl font-bold text-[#ff7a00]/30">{n}</p>
                <h3 className="mb-2 text-base font-semibold text-[#003768]">{title}</h3>
                <p className="text-sm leading-relaxed text-[#475569]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Camel */}
      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold text-[#003768]">Why Camel Global</h2>
          <p className="mb-5 text-[#334155] leading-relaxed">
            Traditional car hire is broken. Prices are opaque, pickup locations are inconvenient, and the
            experience at the desk is rarely pleasant. We believe there&apos;s a better way — one that puts you
            in control, brings competition to your doorstep, and rewards good partners with good reviews.
          </p>
          <p className="mb-5 text-[#334155] leading-relaxed">
            We&apos;re launching in Spain first, where meet &amp; greet car hire is already in high demand but
            underserved by technology. We&apos;ve built the platform to scale — with full support for EUR, GBP,
            and USD, so expanding internationally is straightforward when the time comes.
          </p>
          <p className="text-[#334155] leading-relaxed">
            We&apos;re a small team with a clear goal: make car hire as easy as ordering a taxi. If you&apos;re
            a car hire company and you want to be part of that, we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* For partners */}
      <section className="w-full bg-gradient-to-br from-[#003768] to-[#005b9f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-2xl font-bold">Are you a car hire company?</h2>
          <p className="mb-8 max-w-2xl text-white/80 leading-relaxed">
            Join the Camel Global partner network. You set your own prices, manage your own fleet, and only
            pay a small commission when a booking completes. No monthly fees. No lock-in.
          </p>
          <a
            href="/partner/signup"
            className="inline-block rounded-full bg-[#ff7a00] px-8 py-3 font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            Apply to become a partner →
          </a>
        </div>
      </section>

      {/* Contact */}
      <section className="w-full bg-[#e3f4ff] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-2xl font-bold text-[#003768]">Get in touch</h2>
          <p className="mb-6 text-[#334155] leading-relaxed">
            Got a question, a partnership enquiry, or just want to say hello?
          </p>
          <a
            href="/contact"
            className="inline-block rounded-full bg-[#ff7a00] px-8 py-3 font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            Contact us →
          </a>
        </div>
      </section>

    </div>
  );
}