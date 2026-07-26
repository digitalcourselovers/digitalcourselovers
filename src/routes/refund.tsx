import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — MarketMinds Academy" },
      { name: "description", content: "Refund terms for MarketMinds Academy paid live classes and cohorts." },
      { property: "og:title", content: "Refund Policy — MarketMinds Academy" },
      { property: "og:description", content: "Refund terms for MarketMinds Academy paid live classes and cohorts." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <SiteLayout>
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Refund Policy</h1>
          <p className="mt-3 text-slate-600">Last updated: January 2026</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl space-y-8 px-6 py-16 text-slate-700 leading-relaxed">
        <p>
          All free lessons on MarketMinds Academy remain free. The policy below applies only to paid live cohorts and
          career tracks purchased in INR.
        </p>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">7-day money-back window</h2>
          <p className="mt-2">
            If you are not satisfied within 7 days of your cohort's start date, and you have attended no more than the
            first live session, you can request a full refund.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">After the window</h2>
          <p className="mt-2">
            After the 7-day window or once you have attended two or more live sessions, seats are non-refundable, but
            you may transfer your seat to the next available cohort once, subject to availability.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Cancellations by us</h2>
          <p className="mt-2">
            If we cancel a cohort before it begins, you will receive a full refund automatically to your original
            payment method within 7–10 business days.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">How to request a refund</h2>
          <p className="mt-2">
            Email us via the Contact page with your order details. Refunds are processed to the original payment method
            in INR and typically appear within 7–10 business days depending on your bank.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Non-refundable items</h2>
          <p className="mt-2">
            Downloadable templates, playbooks, and past cohort recordings sold separately are non-refundable once
            accessed.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
