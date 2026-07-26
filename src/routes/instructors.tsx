import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import aisha from "@/assets/instructors/aisha.jpg";
import arjun from "@/assets/instructors/arjun.jpg";
import priya from "@/assets/instructors/priya.jpg";
import rahul from "@/assets/instructors/rahul.jpg";
import neha from "@/assets/instructors/neha.jpg";
import vikram from "@/assets/instructors/vikram.jpg";

export const Route = createFileRoute("/instructors")({
  head: () => ({
    meta: [
      { title: "Instructors — MarketMinds Academy" },
      { name: "description", content: "Learn from India's leading digital marketing practitioners." },
      { property: "og:title", content: "Instructors — MarketMinds Academy" },
      { property: "og:description", content: "Learn from India's leading digital marketing practitioners." },
    ],
  }),
  component: () => {
    const people = [
      { name: "Aisha Sharma", role: "VP Growth, Northwind", focus: "Paid media, MMM", img: aisha },
      { name: "Arjun Mehta", role: "Head of SEO, Contoso", focus: "Technical SEO, content", img: arjun },
      { name: "Priya Nair", role: "Founder, Loopstack", focus: "Lifecycle & retention", img: priya },
      { name: "Rahul Kapoor", role: "Growth Advisor", focus: "B2B demand gen", img: rahul },
      { name: "Neha Iyer", role: "Creative Director", focus: "Brand & social", img: neha },
      { name: "Vikram Reddy", role: "Analytics Lead, ACME", focus: "Attribution, CRO", img: vikram },
    ];
    return (
      <SiteLayout>
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Instructors</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Practitioners first. Every instructor still ships campaigns week over week.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <div key={p.name} className="rounded-2xl border border-slate-200 p-6 transition hover:shadow-md">
                <img
                  src={p.img}
                  alt={p.name}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-50"
                />
                <div className="mt-4 font-semibold text-slate-900">{p.name}</div>
                <div className="text-sm text-slate-600">{p.role}</div>
                <div className="mt-2 text-xs font-medium uppercase tracking-wide text-indigo-600">{p.focus}</div>
              </div>
            ))}
          </div>
        </section>
      </SiteLayout>
    );
  },
});
