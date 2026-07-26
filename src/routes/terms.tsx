import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MarketMinds Academy" },
      { name: "description", content: "Terms governing use of MarketMinds Academy's free lessons and paid live classes." },
      { property: "og:title", content: "Terms of Service — MarketMinds Academy" },
      { property: "og:description", content: "Terms governing use of MarketMinds Academy's free lessons and paid live classes." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
          <p className="mt-3 text-slate-600">Last updated: January 2026</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl space-y-8 px-6 py-16 text-slate-700 leading-relaxed">
        <p>
          This page is maintained by MarketMinds Academy to describe the terms under which you may use our website,
          free lessons, and paid live cohorts. By accessing the site you agree to these terms.
        </p>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">1. Using MarketMinds</h2>
          <p className="mt-2">
            Free lessons are provided as-is for personal, non-commercial learning. You may not redistribute lesson
            content, republish it under your own brand, or resell it in any form.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">2. Accounts</h2>
          <p className="mt-2">
            Some features may require an account. You are responsible for maintaining the confidentiality of your
            credentials and for all activity that happens through your account.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">3. Paid live classes</h2>
          <p className="mt-2">
            Live cohort seats are limited. When you enroll, you agree to attend at the scheduled times, follow our
            community guidelines, and use recordings only for personal review.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">4. Intellectual property</h2>
          <p className="mt-2">
            All lesson text, videos, graphics, and templates remain the property of MarketMinds and their respective
            instructors. Limited personal use is granted; commercial reuse is not.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">5. Disclaimers</h2>
          <p className="mt-2">
            Marketing results depend on many factors we do not control. Nothing on this site is a guarantee of business
            outcomes, revenue, or specific results.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">6. Changes</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of the site after changes means you accept the
            updated version.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">7. Contact</h2>
          <p className="mt-2">Questions about these terms? Reach us via the Contact page.</p>
        </div>
      </section>
    </SiteLayout>
  );
}
