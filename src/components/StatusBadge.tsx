import clsx from "clsx";
import type { TournamentStatus } from "@/lib/types";

const LABELS: Record<TournamentStatus, string> = {
  draft: "En preparación",
  live: "En curso",
  finished: "Finalizado",
};

export function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        status === "live" && "border-plus-edge/60 bg-plus/25 text-[#9ff0bd]",
        status === "draft" && "border-line bg-navy-800 text-ink-muted",
        status === "finished" && "border-gold/60 bg-gold-deep/40 text-gold",
      )}
    >
      {status === "live" && <span className="size-1.5 animate-pulse rounded-full bg-plus-edge" aria-hidden />}
      {LABELS[status]}
    </span>
  );
}
