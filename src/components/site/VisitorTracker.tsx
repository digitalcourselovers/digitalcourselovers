import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { startTracking, trackPageView } from "@/lib/track-client";

/** Records anonymous page views + time on page for public site pages. */
export function VisitorTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => startTracking(), []);

  useEffect(() => {
    trackPageView(pathname, document.title);
  }, [pathname]);

  return null;
}
