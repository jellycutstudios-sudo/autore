import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const FEATURES = [
  { icon: "🤖", text: "AI replies generated in seconds" },
  { icon: "✉️", text: "Email alerts for bad reviews" },
  { icon: "📊", text: "Monthly SEO performance reports" },
  { icon: "🔄", text: "Auto-syncs every hour, hands-free" },
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight text-black">
          AutoRe
        </Link>
        {user ? (
          <Link href="/dashboard" className="btn btn-ghost text-sm py-2 px-3 min-h-0">
            Dashboard →
          </Link>
        ) : (
          <Link href="/login" className="btn btn-ghost text-sm py-2 px-3 min-h-0">
            Sign in
          </Link>
        )}
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          SIMPLE PRICING
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-4 max-w-xl">
          One plan.
          <br />
          One price.
          <br />
          Unlimited ROI.
        </h1>

        <p className="text-gray-500 text-base max-w-sm mb-12">
          Stop losing customers to unanswered reviews. AutoRe handles everything
          automatically.
        </p>

        {/* Pricing Card */}
        <div className="w-full max-w-sm border-2 border-black rounded-2xl overflow-hidden shadow-[6px_6px_0px_#000]">
          {/* Card header */}
          <div className="bg-black text-white px-6 pt-8 pb-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
              Per location / month
            </p>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-black">$39</span>
              <span className="text-gray-400 mb-2 text-lg">/mo</span>
            </div>
            <p className="text-gray-300 text-sm mt-2">
              Add as many locations as you need.
            </p>
          </div>

          {/* Features */}
          <div className="px-6 py-6 bg-white space-y-3">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm">
                <span className="text-lg leading-none">{f.icon}</span>
                <span className="text-gray-700 font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-6 pb-8 bg-white">
            <CheckoutButton />
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Cancel anytime. No contracts. Billed monthly.
        </p>
      </section>
    </main>
  );
}

function CheckoutButton() {
  return (
    <form action="/api/stripe/create-checkout" method="POST">
      <button
        id="btn-start-trial"
        type="submit"
        className="btn btn-primary btn-block btn-lg"
      >
        Get Started — $39/mo
      </button>
    </form>
  );
}
