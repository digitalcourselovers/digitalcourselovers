import { useEffect, useState } from "react";

export type ViewportMetrics = {
  /** Visible viewport height in px (null during SSR / before first measure). */
  height: number | null;
  /** How far the visual viewport is shifted down from the layout viewport. */
  offsetTop: number;
};

/**
 * Tracks the visual viewport so a full-screen chat shell can stay glued to the
 * visible area when the on-screen keyboard opens. On Android the browser shifts
 * the layout viewport instead of resizing it, so we also read `offsetTop` and
 * clamp document scroll back to 0.
 */
export function useViewportMetrics(): ViewportMetrics {
  const [metrics, setMetrics] = useState<ViewportMetrics>({ height: null, offsetTop: 0 });

  useEffect(() => {
    const vv = window.visualViewport;
    let raf = 0;

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Keep the document itself pinned; only the visual viewport may move.
        if (window.scrollY !== 0) window.scrollTo(0, 0);
        setMetrics({
          height: vv ? vv.height : window.innerHeight,
          offsetTop: vv ? Math.max(0, vv.offsetTop) : 0,
        });
      });
    };

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("orientationchange", update);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return metrics;
}

/** Back-compat helper: just the visible viewport height. */
export function useViewportHeight() {
  return useViewportMetrics().height;
}

/** Prevents the document itself from scrolling while a full-screen shell is mounted. */
export function useLockBodyScroll() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
    };
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.position = "relative";
    body.style.width = "100%";
    return () => {
      body.style.overflow = prev.bodyOverflow;
      html.style.overflow = prev.htmlOverflow;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
    };
  }, []);
}
