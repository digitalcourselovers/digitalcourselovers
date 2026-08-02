export type ChatTheme = {
  key: string;
  name: string;
  /** outgoing bubble background */
  bubble: string;
  /** outgoing bubble foreground */
  bubbleFg: string;
  /** accent used for small highlights (swipe icon, reply border, jump button) */
  accent: string;
};

export const CHAT_THEMES: ChatTheme[] = [
  { key: "midnight", name: "Midnight Black", bubble: "#0d0d0d", bubbleFg: "#e7e9ee", accent: "#9ca3af" },
  { key: "rose", name: "Rose Blush", bubble: "#f43f5e", bubbleFg: "#fff1f2", accent: "#fb7185" },
  { key: "velvet", name: "Crimson Velvet", bubble: "#7f1d34", bubbleFg: "#ffe4e6", accent: "#e11d48" },
  { key: "lavender", name: "Lavender Love", bubble: "#5b21b6", bubbleFg: "#f5f3ff", accent: "#a78bfa" },
  { key: "peach", name: "Sunset Peach", bubble: "#e06a53", bubbleFg: "#fff4ef", accent: "#fb923c" },
  { key: "wine", name: "Plum Wine", bubble: "#4a1d3f", bubbleFg: "#fbe8f4", accent: "#d946ef" },
  { key: "cocoa", name: "Cocoa Kiss", bubble: "#3f2a25", bubbleFg: "#f7ece7", accent: "#c98a72" },
  { key: "emerald", name: "Evergreen", bubble: "#14432f", bubbleFg: "#e8f7ef", accent: "#34d399" },
];

export const DEFAULT_CHAT_THEME = CHAT_THEMES[0];

export function themeByKey(key: string | null | undefined): ChatTheme {
  return CHAT_THEMES.find((t) => t.key === key) ?? DEFAULT_CHAT_THEME;
}

export function themeVars(theme: ChatTheme): React.CSSProperties {
  return {
    ["--bub-out" as string]: theme.bubble,
    ["--bub-out-fg" as string]: theme.bubbleFg,
    ["--chat-accent" as string]: theme.accent,
  } as React.CSSProperties;
}
