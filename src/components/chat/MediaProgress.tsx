import { RotateCcw, X } from "lucide-react";

/**
 * WhatsApp-style circular progress ring used for attachment transfers.
 * `progress` is 0..1, or null for an indeterminate spin.
 */
export function MediaProgress({
  progress,
  variant = "upload",
  size = 44,
  onCancel,
  label,
}: {
  progress: number | null;
  variant?: "upload" | "download" | "error";
  size?: number;
  onCancel?: () => void;
  label?: string;
}) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = progress == null ? null : Math.max(0, Math.min(1, progress));
  const done = variant !== "error" && pct != null && pct >= 0.999;

  return (
    <div
      className="grid place-items-center rounded-full bg-black/55 backdrop-blur-sm"
      style={{ width: size + 10, height: size + 10 }}
      aria-label={label ?? (variant === "upload" ? "Uploading" : "Loading")}
      role="progressbar"
      aria-valuenow={pct == null ? undefined : Math.round(pct * 100)}
    >
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className={pct == null ? "animate-spin" : ""}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={done ? "#22c55e" : "currentColor"}
            className={done ? "" : "text-[var(--chat-accent,#f43f5e)]"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={pct == null ? c * 0.72 : c * (1 - pct)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: pct == null ? undefined : "stroke-dashoffset 150ms linear" }}
          />
        </svg>
        {onCancel ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            aria-label={variant === "error" ? "Retry" : "Cancel upload"}
            className="absolute grid h-7 w-7 place-items-center rounded-full text-white/90 transition hover:bg-white/10 active:scale-95"
          >
            {variant === "error" ? <RotateCcw className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
