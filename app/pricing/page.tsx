import { Header } from "@/components/Header";

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="text-4xl font-black">Pricing</h1>
        <p className="mt-3 text-slate-600">Start free. Add paid plans later.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {["Free", "Pro", "Business"].map((plan) => (
            <div key={plan} className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">{plan}</h2>
              <div className="mt-4 text-3xl font-black">{plan === "Free" ? "₹0" : plan === "Pro" ? "₹499/mo" : "Custom"}</div>
              <p className="mt-4 text-sm text-slate-600">Plan details can be edited later.</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
