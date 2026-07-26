import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — MarketMinds Academy" },
      { name: "description", content: "Free lessons for everyone. Optional live cohorts start at ₹14,999." },
      { property: "og:title", content: "Pricing — MarketMinds Academy" },
      { property: "og:description", content: "Free lessons for everyone. Optional paid live classes." },
    ],
  }),
  component: () => {
    const tiers = [
      { name: "Free library", price: "₹0", sub: "Forever free", bullets: ["All written lessons", "Chapter worksheets", "New articles monthly", "No signup required"] },
      { name: "Single live cohort", price: "₹14,999", sub: "per course", bullets: ["One live cohort", "Weekly live sessions", "1:1 mentor time", "Alumni community"], featured: true },
      { name: "Career track", price: "₹39,000", sub: "3 cohorts bundle", bullets: ["Three live courses", "Portfolio project", "Interview prep", "Job referral network"] },
      { name: "For teams", price: "Custom", sub: "5+ seats", bullets: ["Private cohort", "Company-tailored curriculum", "Executive sponsor", "Priority support"] },
    ];
    return (
      <SiteLayout>
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-14 text-center sm:px-6 sm:py-16">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Pricing</h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">Every lesson is free. Join a live cohort only if you want mentorship.</p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t) => {
              const isFree = t.name === "Free library";
              const isTeam = t.name === "For teams";
              return (
                <div key={t.name} className={`flex flex-col rounded-2xl border p-6 ${t.featured ? "border-indigo-500 bg-indigo-50/40 shadow-lg" : "border-slate-200 bg-white"}`}>
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{t.price}</div>
                  <div className="mt-1 text-xs text-slate-500">{t.sub}</div>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                    {t.bullets.map((b) => <li key={b}>• {b}</li>)}
                  </ul>
                  <button className={`mt-6 w-full rounded-full py-2.5 text-sm font-medium ${t.featured ? "bg-indigo-600 text-white hover:bg-indigo-700" : isFree ? "border border-slate-300 bg-white text-slate-800 hover:border-slate-400" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                    {isFree ? "Start reading" : isTeam ? "Contact us" : "Enroll now"}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-xs text-slate-500">Prices in INR. GST extra where applicable.</p>
        </section>
      </SiteLayout>
    );
  },
});
