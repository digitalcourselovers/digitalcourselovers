import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — MarketMinds Academy" },
      { name: "description", content: "Get in touch about cohorts, private team training, or partnerships." },
      { property: "og:title", content: "Contact — MarketMinds Academy" },
      { property: "og:description", content: "Get in touch about our programs." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Contact us</h1>
        <p className="mt-3 text-slate-600">We reply to every message within one business day.</p>
        <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <input placeholder="Your name" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none" />
          <input placeholder="Email" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none" />
          <textarea placeholder="How can we help?" rows={5} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none" />
          <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Send message</button>
        </form>
      </section>
    </SiteLayout>
  ),
});
