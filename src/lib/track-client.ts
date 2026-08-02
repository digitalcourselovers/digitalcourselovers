/** Anonymous visitor tracking for the public site: records what was opened and when. */

const VISITOR_KEY = "mm.vid";
const SESSION_KEY = "mm.sid";
const GEO_KEY = "mm.geo";

function rand() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function visitorKey() {
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = rand();
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

function sessionKey() {
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = rand();
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

type Geo = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
};

let geo: Geo | null = null;

/** Looked up from the visitor's own network so the IP + city are always known. */
async function loadGeo(): Promise<Geo> {
  if (geo) return geo;
  try {
    const cached = sessionStorage.getItem(GEO_KEY);
    if (cached) {
      geo = JSON.parse(cached) as Geo;
      return geo;
    }
  } catch {
    /* ignore */
  }
  const sources: { url: string; map: (j: any) => Geo }[] = [
    {
      url: "https://ipwho.is/",
      map: (j) => ({
        ip: j.ip,
        city: j.city,
        region: j.region,
        country: j.country,
        isp: j.connection?.isp ?? j.connection?.org,
      }),
    },
    {
      url: "https://ipapi.co/json/",
      map: (j) => ({
        ip: j.ip,
        city: j.city,
        region: j.region,
        country: j.country_name,
        isp: j.org,
      }),
    },
    {
      url: "https://api.ipify.org?format=json",
      map: (j) => ({ ip: j.ip }),
    },
  ];
  for (const s of sources) {
    try {
      const res = await fetch(s.url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const mapped = s.map(await res.json());
      if (mapped.ip) {
        geo = mapped;
        try {
          sessionStorage.setItem(GEO_KEY, JSON.stringify(mapped));
        } catch {
          /* ignore */
        }
        return geo;
      }
    } catch {
      /* try next */
    }
  }
  geo = {};
  return geo;
}

let currentPath = "";

async function post(path: string, title?: string) {
  const g = await loadGeo();
  try {
    await fetch("/api/public/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "view",
        path,
        title,
        visitorKey: visitorKey(),
        sessionKey: sessionKey(),
        referrer: document.referrer || undefined,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ip: g.ip,
        city: g.city,
        region: g.region,
        country: g.country,
        isp: g.isp,
      }),
    });
  } catch {
    /* ignore */
  }
}

export function trackPageView(path: string, title?: string) {
  if (path.startsWith("/portal") || path.startsWith("/instructor-signin")) return;
  if (path === currentPath) return;
  currentPath = path;
  void post(path, title);
}

/** Kept for API compatibility — no timers, nothing is counted. */
export function startTracking() {
  void loadGeo();
  return () => {};
}
