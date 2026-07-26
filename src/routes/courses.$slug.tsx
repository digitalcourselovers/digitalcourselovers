import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { COURSES } from "./courses.index";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => {
    const c = COURSES.find((x) => x.slug === params.slug);
    const title = c ? `${c.title} — Free lesson · MarketMinds` : "Lesson — MarketMinds";
    return {
      meta: [
        { title },
        { name: "description", content: c?.desc ?? "Free digital marketing lesson" },
        { property: "og:title", content: title },
        { property: "og:description", content: c?.desc ?? "Free digital marketing lesson" },
        { property: "og:type", content: "article" },
      ],
    };
  },
  loader: ({ params }) => {
    const course = COURSES.find((c) => c.slug === params.slug);
    if (!course) throw notFound();
    return { course };
  },
  component: CourseDetail,
});

const CHAPTER_TITLES = [
  "Frameworks & baselines",
  "Audience & positioning",
  "Channel deep dive",
  "Creative & production",
  "Measurement & attribution",
  "Iteration & scale",
];

function CourseDetail() {
  const { course } = Route.useLoaderData() as { course: (typeof COURSES)[number] };
  return (
    <SiteLayout>
      <article>
        <header className="border-b border-slate-100 bg-gradient-to-b from-indigo-50/40 to-white">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Free article · {course.tag}
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{course.title}</h1>
            <p className="mt-4 text-lg text-slate-600">{course.desc}</p>
            <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
              <span>By the MarketMinds team</span>
              <span>·</span>
              <span>Updated 2026</span>
              <span>·</span>
              <span>~18 min read</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-14">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold text-slate-900">Introduction</h2>
            <p className="mt-4 text-slate-700 leading-relaxed">
              Welcome to <strong>{course.title}</strong>. This article is a complete, free
              walkthrough of the discipline — no signup, no paywall. Read it end to end, or
              jump to a chapter. If you want feedback from a senior operator afterwards, our
              paid live classes are optional and completely separate.
            </p>
            <p className="mt-4 text-slate-700 leading-relaxed">
              {course.desc} We'll cover the mental models that hold up in market today,
              the tactics that actually move numbers, and the traps that waste budget. Every
              chapter ends with a short worksheet you can copy.
            </p>

            <h2 className="mt-12 text-2xl font-semibold text-slate-900">What you'll learn</h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>• A working mental model of the channel and how it fits the funnel.</li>
              <li>• The specific inputs top operators optimize each week.</li>
              <li>• How to measure real impact vs. vanity metrics.</li>
              <li>• A repeatable weekly cadence you can run solo or on a team.</li>
            </ul>
          </div>

          <div className="mt-14 space-y-10">
            {CHAPTER_TITLES.map((title, i) => (
              <section key={title} id={`chapter-${i + 1}`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Chapter {i + 1}
                </div>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h2>
                <p className="mt-4 text-slate-700 leading-relaxed">
                  In this chapter we unpack {title.toLowerCase()} for {course.title.toLowerCase()}.
                  We start with the outcome you're optimizing for, then work backwards to the
                  inputs you actually control day to day. Expect concrete examples, common
                  mistakes, and a short template you can adopt this week.
                </p>
                <p className="mt-4 text-slate-700 leading-relaxed">
                  The goal isn't to memorize tactics — channels change quarterly. The goal is
                  to build a mental model that survives platform churn, so you can walk into
                  any new tool and know what to look at first.
                </p>
                <blockquote className="mt-6 border-l-4 border-indigo-300 bg-indigo-50/40 px-5 py-3 text-sm italic text-slate-700">
                  Key idea: optimize inputs, not outputs. Outputs are lagging; inputs are what
                  you control.
                </blockquote>
              </section>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next steps</div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Enjoyed the article?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Keep exploring the free library, or join a live cohort for feedback and mentorship.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/courses" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
                More free lessons
              </Link>
              <Link to="/pricing" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400">
                See live class pricing
              </Link>
            </div>
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}
