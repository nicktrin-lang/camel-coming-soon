import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Coming Soon — Camel Global",
  description: "Meet & greet car hire, delivered to your door. Launching soon.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/camel-logo.png"
        alt="Camel Global"
        width={200}
        height={70}
        className="h-16 w-auto brightness-0 invert mb-12"
        priority
      />

      <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-4">
        Coming Soon
      </p>
      <h1 className="text-5xl font-black text-white sm:text-6xl leading-none">
        Meet & Greet<br />Car Hire
      </h1>
      <p className="mt-6 text-lg font-bold text-white/50 max-w-md">
        Your car delivered to you, wherever you are. No airport desk. No queuing. No hidden costs.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-xl w-full">
        {[
          { title: "Meet & Greet", desc: "Car delivered to your chosen location" },
          { title: "Zero Excess", desc: "Full insurance included, no surprises" },
          { title: "Pay for Fuel Used", desc: "Full tank deposit — refunded for unused fuel" },
        ].map(({ title, desc }) => (
          <div key={title} className="border border-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">{title}</p>
            <p className="mt-1 text-xs font-bold text-white/40">{desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-sm font-bold text-white/30">
        Are you a car hire company?{" "}
        <Link href="https://portal.camel-global.com" className="text-white/60 underline hover:text-white transition-colors">
          Join as a partner →
        </Link>
      </p>

      <p className="mt-16 text-xs font-bold text-white/20">
        © {new Date().getFullYear()} Camel Global Ltd. Registered in England & Wales.
      </p>
    </div>
  );
}