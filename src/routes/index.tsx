import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import heroImg from "@/assets/hero-marketing.jpg";
import teamImg from "@/assets/team-collab.jpg";
import funnelImg from "@/assets/funnel-graphic.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketMinds Academy — Learn digital marketing, free" },
      { name: "description", content: "Free digital marketing lessons taught by senior operators. Read at your own pace, or join optional live cohorts." },
      { property: "og:title", content: "MarketMinds Academy" },
      { property: "og:description", content: "Free digital marketing lessons. Optional live classes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const featured = [
  { slug: "seo-foundations", title: "SEO Foundations", tag: "8 chapters", desc: "Rank in Google. Build organic traffic that compounds.", color: "from-emerald-500 to-teal-600", icon: "🔍" },
  { slug: "paid-media-mastery", title: "Paid Media", tag: "6 chapters", desc: "Meta, Google, and TikTok ads that actually convert.", color: "from-rose-500 to-orange-500", icon: "🎯" },
  { slug: "growth-marketing", title: "Growth Loops", tag: "10 chapters", desc: "Full-funnel systems for activation and retention.", color: "from-indigo-500 to-purple-600", icon: "📈" },
  { slug: "analytics-cro", title: "Analytics & CRO", tag: "6 chapters", desc: "Attribution, experimentation, and real lift.", color: "from-sky-500 to-blue-600", icon: "📊" },
  { slug: "content-strategy", title: "Content", tag: "5 chapters", desc: "Editorial planning that ranks and converts.", color: "from-amber-500 to-yellow-500", icon: "✍️" },
  { slug: "email-lifecycle", title: "Email & Lifecycle", tag: "4 chapters", desc: "Journeys, segmentation, deliverability.", color: "from-pink-500 to-fuchsia-600", icon: "✉️" },
];

const logos = ["Google", "Meta", "HubSpot", "Shopify", "Notion", "Stripe"];

function Home() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-indigo-50/70 via-white to-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/40 via-fuchsia-200/40 to-rose-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-600 shadow-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                100% Free curriculum · Updated 2026
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Learn digital marketing. <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">Free forever.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Full articles, real frameworks, and playbooks written by senior operators. No signup. No paywall. Optional live cohorts when you're ready for feedback.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
                >
                  Start learning free →
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Live classes
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {["from-rose-400 to-pink-500", "from-indigo-400 to-purple-500", "from-emerald-400 to-teal-500", "from-amber-400 to-orange-500"].map((g, i) => (
                      <div key={i} className={`h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br ${g}`} />
                    ))}
                  </div>
                  <span>2.3k+ active learners</span>
                </div>
                <div className="flex items-center gap-1 text-amber-500">★★★★★ <span className="ml-1 text-slate-500">4.9 avg rating</span></div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-200/50 via-fuchsia-200/40 to-rose-200/40 blur-2xl" />
              <img
                src={heroImg}
                alt="Marketing analytics dashboard"
                width={1600}
                height={1100}
                className="relative rounded-2xl border border-slate-200 shadow-2xl"
              />
              <div className="absolute -bottom-4 -left-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:-bottom-6 sm:-left-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">↑</div>
                  <div>
                    <div className="text-xs text-slate-500">Organic traffic</div>
                    <div className="text-sm font-bold text-slate-900">+312% in 90 days</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <div className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
            Alumni work at
          </div>
          <div className="mt-6 grid grid-cols-3 items-center gap-6 sm:grid-cols-6">
            {logos.map((l) => (
              <div key={l} className="text-center text-lg font-bold tracking-tight text-slate-400">
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured lessons */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Curriculum</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Popular free lessons</h2>
            <p className="mt-2 max-w-xl text-slate-600">Read the full article. No signup. No paywall.</p>
          </div>
          <Link to="/courses" className="shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            View all 8 lessons →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => (
            <Link
              key={c.slug}
              to="/courses/$slug"
              params={{ slug: c.slug }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-2xl"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-2xl shadow-lg`}>
                {c.icon}
              </div>
              <div className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Free · {c.tag}</div>
              <h3 className="mt-1 text-xl font-bold text-slate-900 group-hover:text-indigo-700">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{c.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                Read article <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Video section */}
      <section className="border-y border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">Watch a lesson</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                See how the pros think about growth.
              </h2>
              <p className="mt-4 text-slate-300">
                Every article is paired with a short video explainer. Free, unlisted, no ads. Get the mental model in 8 minutes, then read the deep dive.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "Real case studies from operators at Google, Meta, Shopify",
                  "Frameworks you can steal for your next campaign",
                  "New videos added every week",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-fuchsia-500/20 text-fuchsia-300">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/courses"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Browse lessons →
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <div className="aspect-video">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/bixR-KIJKYM"
                  title="Digital Marketing Explained"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two ways */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Two paths</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Free forever. Or go live with mentors.
          </h2>
          <p className="mt-3 text-slate-600">Pick whichever fits how you learn best. Or use both.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            to="/courses"
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-2xl"
          >
            <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              Free · Self-paced
            </div>
            <h3 className="mt-4 text-2xl font-bold text-slate-900">Read the library</h3>
            <p className="mt-2 text-sm text-slate-600">Full articles, worksheets, and templates. Learn at your own pace, on your own schedule.</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li>✓ 8 in-depth articles</li>
              <li>✓ Downloadable templates</li>
              <li>✓ Weekly new content</li>
              <li>✓ No signup required</li>
            </ul>
            <div className="mt-8 text-sm font-semibold text-emerald-700 group-hover:underline">Browse lessons →</div>
          </Link>
          <Link
            to="/pricing"
            className="group relative overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-8 transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-2xl"
          >
            <div className="inline-flex rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              Paid · Live with experts
            </div>
            <h3 className="mt-4 text-2xl font-bold text-slate-900">Join a cohort</h3>
            <p className="mt-2 text-sm text-slate-600">Weekly live sessions, portfolio reviews, and 1:1 mentor time with senior operators.</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li>✓ Live workshops every week</li>
              <li>✓ Portfolio & work review</li>
              <li>✓ Private mentor slack</li>
              <li>✓ Certificate of completion</li>
            </ul>
            <div className="mt-8 text-sm font-semibold text-indigo-700 group-hover:underline">See pricing →</div>
          </Link>
        </div>
      </section>

      {/* Learning outcomes with image */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <img
                src={teamImg}
                alt="Team collaborating on marketing strategy"
                width={1400}
                height={900}
                loading="lazy"
                className="rounded-2xl border border-slate-200 shadow-xl"
              />
            </div>
            <div className="order-1 lg:order-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Outcomes</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                What you'll actually be able to do.
              </h2>
              <div className="mt-8 space-y-6">
                {[
                  { n: "01", t: "Ship campaigns that measurably move revenue", d: "Not vanity metrics. Real pipeline. Real ROAS. Real retention." },
                  { n: "02", t: "Read data like a senior operator", d: "Attribution, incrementality, and lift — without a data team." },
                  { n: "03", t: "Build systems, not one-off tactics", d: "Frameworks that survive platform churn and algorithm updates." },
                ].map((o) => (
                  <div key={o.n} className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-bold text-indigo-600 shadow">
                      {o.n}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{o.t}</div>
                      <p className="mt-1 text-sm text-slate-600">{o.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Funnel graphic section */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src={funnelImg}
          alt="Marketing funnel visualization"
          width={1200}
          height={900}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">The full funnel</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              From first click to lifetime value.
            </h2>
            <p className="mt-4 text-slate-300">
              Every article maps to a stage of the funnel. Read them in order for the full curriculum, or jump to what you need today.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["Awareness", "Acquisition", "Activation", "Retention"].map((s, i) => (
                <div key={s} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-xs font-semibold text-fuchsia-300">Stage {i + 1}</div>
                  <div className="mt-1 font-bold">{s}</div>
                </div>
              ))}
            </div>
            <Link
              to="/courses"
              className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Explore the curriculum →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-14 sm:grid-cols-4 sm:px-6">
          {[
            { k: "100%", v: "Free lessons" },
            { k: "18+", v: "Expert mentors" },
            { k: "2.3k", v: "Active learners" },
            { k: "4.9★", v: "Average rating" },
          ].map((s) => (
            <div key={s.v} className="text-center">
              <div className="bg-gradient-to-br from-indigo-600 to-fuchsia-600 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">{s.k}</div>
              <div className="mt-2 text-sm text-slate-500">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Process</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How it works</h2>
          <p className="mt-3 text-slate-600">Three steps. That's it.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            { n: "01", t: "Pick a lesson", d: "Open any article. Read it end to end. Keep the tab open forever.", icon: "📖" },
            { n: "02", t: "Practice", d: "Use the templates and worksheets on your own project this week.", icon: "🛠️" },
            { n: "03", t: "Go live (optional)", d: "Join a paid cohort for feedback, review, and mentorship.", icon: "🎓" },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-lg">
              <div className="text-3xl">{s.icon}</div>
              <div className="mt-4 text-sm font-bold text-indigo-600">{s.n}</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{s.t}</div>
              <p className="mt-2 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Loved by learners</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What people say</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { q: "Got my first marketing role from these articles. Zero paywall, and the frameworks actually held up in interviews.", n: "Priya S.", r: "Growth Analyst, Bangalore" },
              { q: "I read for months, then joined a cohort for feedback. Best career decision this year.", n: "Marcus L.", r: "PMM, Berlin" },
              { q: "Real frameworks, no fluff. I've bookmarked half the site.", n: "Ana R.", r: "Founder, São Paulo" },
            ].map((t) => (
              <figure key={t.n} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-amber-500">★★★★★</div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">"{t.q}"</blockquote>
                <figcaption className="mt-4 border-t border-slate-100 pt-4">
                  <div className="text-sm font-semibold text-slate-900">{t.n}</div>
                  <div className="text-xs text-slate-500">{t.r}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">FAQ</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Common questions</h2>
        </div>
        <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {[
            { q: "Is it really free?", a: "Yes. Every article, forever. No signup, no email wall, no upsell interruptions." },
            { q: "What's paid then?", a: "Only the optional live cohorts — weekly sessions, portfolio reviews, and mentor time. Everything else is free." },
            { q: "Do I need experience?", a: "No. Start with SEO Foundations or Content Strategy — they assume zero background." },
            { q: "Do you offer certificates?", a: "Live cohort graduates get a signed certificate. Free lessons don't include certificates." },
            { q: "Teams?", a: "Yes. See the Pricing page for team plans and custom workshops." },
          ].map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900">
                {f.q}
                <span className="ml-4 text-indigo-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200 bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-rose-500">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 sm:py-24">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Start reading today.
          </h2>
          <p className="mt-4 text-lg text-white/90">No signup. No paywall. Just marketing, taught well.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/courses" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg hover:bg-slate-100">
              Browse free lessons →
            </Link>
            <Link to="/pricing" className="inline-flex items-center justify-center rounded-full border-2 border-white/70 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
              See live class pricing
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
