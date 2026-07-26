import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MarketMinds Academy" },
      { name: "description", content: "How MarketMinds Academy collects, uses, and protects your information." },
      { property: "og:title", content: "Privacy Policy — MarketMinds Academy" },
      { property: "og:description", content: "How MarketMinds Academy collects, uses, and protects your information." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-3 text-slate-600">Last updated: January 2026</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl space-y-8 px-6 py-16 text-slate-700 leading-relaxed">
        <p>
          This page is maintained by MarketMinds Academy to explain what information we collect and how we use it. It
          is not a certification or independent audit.
        </p>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Information we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Account details you provide when you sign up (name, email).</li>
            <li>Enrollment details when you join a paid cohort.</li>
            <li>Basic usage data such as pages visited and lessons opened.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">How we use it</h2>
          <p className="mt-2">
            We use your information to deliver lessons, run live cohorts, respond to support requests, and improve the
            site. We do not sell your personal information.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Cookies</h2>
          <p className="mt-2">
            We use essential cookies to keep you signed in and remember preferences. Analytics cookies, if enabled, help
            us understand which lessons are most useful.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Data retention</h2>
          <p className="mt-2">
            We retain account data while your account is active. You can request deletion at any time via the Contact
            page, and we will remove your personal information within a reasonable period.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Your rights</h2>
          <p className="mt-2">
            Depending on where you live, you may have rights to access, correct, or delete your data. Contact us to
            exercise these rights.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p className="mt-2">For privacy questions, please reach us via the Contact page.</p>
        </div>
      </section>
    </SiteLayout>
  );
}
