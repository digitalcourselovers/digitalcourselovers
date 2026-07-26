import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — MarketMinds Academy" },
      { name: "description", content: "Live cohort courses in SEO, paid media, growth, analytics, content, and email marketing." },
      { property: "og:title", content: "Courses — MarketMinds Academy" },
      { property: "og:description", content: "Live cohort courses in digital marketing." },
    ],
  }),
  component: CoursesPage,
});

export const COURSES = [
  { slug: "seo-foundations", title: "SEO Foundations", tag: "8 weeks · Beginner", desc: "Technical SEO, keyword strategy, and content operations." },
  { slug: "paid-media-mastery", title: "Paid Media Mastery", tag: "6 weeks · Intermediate", desc: "Meta, Google, and TikTok — from creative testing to MMM." },
  { slug: "growth-marketing", title: "Growth Marketing", tag: "10 weeks · Advanced", desc: "Full-funnel loops, activation, and retention systems." },
  { slug: "analytics-cro", title: "Analytics & CRO", tag: "6 weeks · Intermediate", desc: "Attribution, experimentation, and lift analysis." },
  { slug: "content-strategy", title: "Content Strategy", tag: "5 weeks · Beginner", desc: "Editorial planning that ranks and converts." },
  { slug: "email-lifecycle", title: "Email & Lifecycle", tag: "4 weeks · Beginner", desc: "Journeys, segmentation, and deliverability." },
  { slug: "brand-social", title: "Brand & Social", tag: "5 weeks · Intermediate", desc: "Position, distribute, and iterate on brand narrative." },
  { slug: "b2b-demand-gen", title: "B2B Demand Gen", tag: "8 weeks · Advanced", desc: "ABM, pipeline modeling, and RevOps." },
];

function CoursesPage() {
  return (
    <SiteLayout>
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Free lessons</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Click any lesson to read the full article — free, no signup. Want feedback from a
            senior operator? Optional paid live classes are available on the Pricing page.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((c) => (
            <Link
              key={c.slug}
              to="/courses/$slug"
              params={{ slug: c.slug }}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{c.tag}</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-indigo-700">{c.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
