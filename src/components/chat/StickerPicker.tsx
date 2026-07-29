import { useEffect, useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useServerFn } from "@tanstack/react-start";
import { searchGifs } from "@/lib/klipy.functions";

type Gif = { id: string; title: string; preview: string; full: string };

export function StickerPicker({
  customerId,
  onEmoji,
  onGif,
  onClose,
}: {
  customerId: string;
  onEmoji: (emoji: string) => void;
  onGif: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"emoji" | "gif">("emoji");
  const search = useServerFn(searchGifs);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab !== "gif") return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await search({ data: { q, customerId } });
        if (!cancelled) setItems(res.items as Gif[]);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 300 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, customerId, search, tab]);

  return (
    <div className="absolute bottom-14 left-0 right-0 z-20 mx-2 flex h-[22rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl sm:right-auto sm:w-96">
      <div className="flex items-center justify-between border-b border-white/5 px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("emoji")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              tab === "emoji" ? "bg-white/10 text-slate-100" : "text-slate-400 hover:bg-white/5"
            }`}
          >
            😊 Emoji
          </button>
          <button
            type="button"
            onClick={() => setTab("gif")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition ${
              tab === "gif" ? "bg-white/10 text-slate-100" : "text-slate-400 hover:bg-white/5"
            }`}
          >
            GIF
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10"
        >
          Close
        </button>
      </div>

      {tab === "emoji" ? (
        <div className="flex-1 overflow-hidden">
          <Picker
            data={data}
            theme="dark"
            onEmojiSelect={(e: { native: string }) => onEmoji(e.native)}
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>
      ) : (
        <>
          <div className="border-b border-white/5 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search GIFs on KLIPY"
              className="w-full rounded-lg bg-[#0f0f0f] px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <div
            className="grid flex-1 auto-rows-[7rem] grid-cols-2 gap-1 overflow-y-auto p-1 sm:auto-rows-[6rem] sm:grid-cols-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ msOverflowStyle: "none" }}
          >
            {loading && items.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">Loading…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">No GIFs found.</div>
            )}
            {items.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onGif(g.full)}
                className="relative h-full w-full overflow-hidden rounded-md bg-black/40 transition hover:opacity-80"
              >
                <img
                  src={g.preview}
                  alt={g.title}
                  loading="lazy"
                  className="absolute inset-0 block h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
          <div className="border-t border-white/5 py-1 text-center text-[10px] text-slate-500">
            Powered by KLIPY
          </div>
        </>
      )}
    </div>
  );
}
