import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — MarketMinds Academy" },
      { name: "description", content: "MarketMinds Academy trains the next generation of digital marketing operators." },
      { property: "og:title", content: "About — MarketMinds Academy" },
      { property: "og:description", content: "Our mission and story." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Built by operators. For operators.</h1>
        <p className="mt-6 text-lg text-slate-600">
          MarketMinds started as a private Slack of six growth leads sharing what was working
          each week. Today it's a program that trains hundreds of marketers a year with the
          same first-principles rigor that got us here.
        </p>
        <p className="mt-4 text-lg text-slate-600">
          We believe marketing education should look like the work itself: hands-on, current,
          and taught by people who ship. Everything we build reflects that.
        </p>
      </section>
    </SiteLayout>
  ),
});
