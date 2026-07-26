import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PortalModal } from "./PortalModal";

export function SiteFooter() {
  const [portalOpen, setPortalOpen] = useState(false);
  const clickCount = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyrightClick = () => {
    clickCount.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 1200);
    if (clickCount.current >= 3) {
      clickCount.current = 0;
      if (timer.current) clearTimeout(timer.current);
      setPortalOpen(true);
    }
  };

  return (
    <>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-sm font-bold text-white">
                M
              </div>
              <span className="font-semibold text-slate-900">MarketMinds</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Free digital marketing education for self-learners, with optional live classes taught by senior operators.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Free lessons</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/courses/$slug" params={{ slug: "seo-foundations" }} className="hover:text-indigo-600">SEO Foundations</Link></li>
              <li><Link to="/courses/$slug" params={{ slug: "paid-media-mastery" }} className="hover:text-indigo-600">Paid Media Mastery</Link></li>
              <li><Link to="/courses/$slug" params={{ slug: "growth-marketing" }} className="hover:text-indigo-600">Growth Marketing</Link></li>
              <li><Link to="/courses/$slug" params={{ slug: "analytics-cro" }} className="hover:text-indigo-600">Analytics & CRO</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/about" className="hover:text-indigo-600">About</Link></li>
              <li><Link to="/instructors" className="hover:text-indigo-600">Instructors</Link></li>
              
              <li><Link to="/contact" className="hover:text-indigo-600">Contact</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/terms" className="hover:text-indigo-600">Terms</Link></li>
              <li><Link to="/privacy" className="hover:text-indigo-600">Privacy</Link></li>
              <li><Link to="/refund" className="hover:text-indigo-600">Refund policy</Link></li>
            </ul>
          </div>

        </div>
        <div className="border-t border-slate-200">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-slate-500">
            <button
              type="button"
              onClick={handleCopyrightClick}
              className="cursor-default select-none text-inherit hover:text-slate-500"
              aria-label="copyright"
            >
              © 2026 MarketMinds Academy. All rights reserved.
            </button>
            <div>Made with focus.</div>
          </div>
        </div>
      </footer>
      <PortalModal open={portalOpen} onClose={() => setPortalOpen(false)} />
    </>
  );
}
