"use client";

import { ChevronDown } from "lucide-react";
import type { Team } from "@/lib/types";
import { Shield } from "./Shield";

export const BYE = "__bye__";

/** Select de un hueco de la primera ronda, con el escudo del equipo elegido (como en la propuesta). */
export function SlotSelect({
  teams,
  slots,
  slot,
  label,
  disabled,
  onChange,
}: {
  teams: Team[];
  slots: (string | null)[];
  slot: number;
  label: string;
  disabled?: boolean;
  onChange: (teamId: string | null) => void;
}) {
  const current = teams.find((t) => t.id === slots[slot]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
        <Shield color={current?.color} size={22} glow={Boolean(current)} />
      </span>
      <select
        aria-label={label}
        disabled={disabled}
        value={slots[slot] ?? BYE}
        onChange={(e) => onChange(e.target.value === BYE ? null : e.target.value)}
        className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-line bg-navy-900 pr-10 pl-12 font-semibold text-ink hover:border-ink-muted focus:border-gold focus:outline-none disabled:cursor-default disabled:opacity-80"
      >
        {teams.map((t) => {
          const at = slots.indexOf(t.id);
          const where = at < 0 ? " (sin cruce)" : at === slot ? "" : ` (partido ${Math.floor(at / 2) + 1})`;
          return (
            <option key={t.id} value={t.id}>
              {t.name}
              {where}
            </option>
          );
        })}
        <option value={BYE}>Pase directo (sin rival)</option>
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
    </div>
  );
}
