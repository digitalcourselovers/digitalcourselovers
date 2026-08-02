// Server-only Telegram helpers. Uses your own bot token directly —
// no gateway, no external SDK, Workers-compatible (fetch only).

export const GF_EMAIL = "gf@gmail.com";

export const SITE_URL = "https://digitalcourselovers.pages.dev";

export const PARTNER_PING_TEXT = `She's thinking of you ❤️ — open the site.\n\n${SITE_URL}`;

const lastPingAt = new Map<string, number>();
const THROTTLE_MS = 30_000;

export function throttled(userId: string): boolean {
  const prev = lastPingAt.get(userId) ?? 0;
  const now = Date.now();
  if (now - prev < THROTTLE_MS) return true;
  lastPingAt.set(userId, now);
  return false;
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_BF_CHAT_ID"];
  if (!token || !chatId) {
    console.warn("[telegram] missing TELEGRAM_BOT_TOKEN or TELEGRAM_BF_CHAT_ID");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_notification: false,
        link_preview_options: { is_disabled: false, url: SITE_URL },
        reply_markup: { inline_keyboard: [[{ text: "Open site 💌", url: SITE_URL }]] },
      }),
    });

    if (!res.ok) {
      console.warn("[telegram] sendMessage failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    const json = (await res.json()) as { ok?: boolean; description?: string };
    if (!json.ok) {
      console.warn("[telegram] api error", json.description);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[telegram] send error", err);
    return false;
  }
}
