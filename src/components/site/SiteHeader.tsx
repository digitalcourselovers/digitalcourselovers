import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-sm font-bold text-white">
            M
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            MarketMinds Academy
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          <Link to="/courses" className="hover:text-slate-900" activeProps={{ className: "text-slate-900 font-medium" }}>
            Courses
          </Link>
          <Link to="/instructors" className="hover:text-slate-900" activeProps={{ className: "text-slate-900 font-medium" }}>
            Instructors
          </Link>
          <Link to="/pricing" className="hover:text-slate-900" activeProps={{ className: "text-slate-900 font-medium" }}>
            Pricing
          </Link>
          <Link to="/about" className="hover:text-slate-900" activeProps={{ className: "text-slate-900 font-medium" }}>
            About
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/contact"
            className="hidden rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 md:inline-block"
          >
            Contact
          </Link>
          <Link
            to="/courses"
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Enroll
          </Link>
        </div>
      </div>
    </header>
  );
}
