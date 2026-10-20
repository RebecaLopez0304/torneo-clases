"use client";

import Link from "next/link";
import { Settings, UserPlus } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useAllRequests } from "@/lib/requests";
import { setSlot } from "@/lib/tournaments";
import type { Tournament } from "@/lib/types";
import { DraftControls } from "./DraftControls";
import { ScoreboardHeader } from "./Scoreboard";
import { SlotSelect } from "./SlotSelect";

/** Panel derecho en preparación (solo admins): arma los cruces partido por partido. */
export function DraftSetup({
  tournament: t,
  selected,
  onSelect,
}: {
  tournament: Tournament;
  selected: number;
  onSelect: (m: number) => void;
}) {
  const matches = t.slots.length / 2;
  const m = Math.min(selected, matches - 1);
  const pending = useAllRequests(t.id, true)?.filter((r) => r.status === "pending").length ?? 0;

  async function place(slot: number, teamId: string | null) {
    try {
      await setSlot(t.id, slot, teamId);
    } catch {
      toast.error("No se pudo cambiar el cruce.");
    }
  }

  return (
    <>
      <ScoreboardHeader />
      <div className="px-4 pt-4 pb-5 sm:px-6">
        <p className="rounded-lg border border-line-soft bg-navy-950/40 px-3 py-2 text-sm text-ink-muted">
          El torneo está en preparación. Solo los administradores ven los cruces; el público ve una pantalla de espera
          hasta que lo inicies.
        </p>
        {pending > 0 && (
          <Link
            href={`/t/${t.id}/configurar?tab=solicitudes`}
            className="mt-3 flex items-center gap-2 rounded-lg border border-gold/50 bg-gold-deep/30 px-3 py-2.5 text-sm font-semibold text-gold-soft hover:border-gold"
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {pending === 1 ? "1 solicitud de inscripción por revisar" : `${pending} solicitudes de inscripción por revisar`}
          </Link>
        )}

        <section className="mt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold uppercase">
            <Settings className="size-5" aria-hidden /> Configurar enfrentamiento
          </h3>
          {t.teams.length < 2 ? (
            <p className="mt-2 text-ink-muted">Inscribe al menos 2 equipos para armar los cruces.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Partido de primera ronda">
                {Array.from({ length: matches }, (_, i) => (
                  <button
                    key={i}
                    role="tab"
                    type="button"
                    aria-selected={i === m}
                    onClick={() => onSelect(i)}
                    className={clsx(
                      "h-9 min-w-9 rounded-lg border px-2 font-display font-bold",
                      i === m ? "border-gold bg-gold/15 text-gold" : "border-line bg-navy-900 text-ink-muted hover:text-ink",
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-ink-muted">Equipo local</p>
                  <SlotSelect teams={t.teams} slots={t.slots} slot={m * 2} label="Equipo local" onChange={(id) => place(m * 2, id)} />
                </div>
                <div>
                  <p className="mb-1 text-sm text-ink-muted">Equipo visitante</p>
                  <SlotSelect
                    teams={t.teams}
                    slots={t.slots}
                    slot={m * 2 + 1}
                    label="Equipo visitante"
                    onChange={(id) => place(m * 2 + 1, id)}
                  />
                </div>
              </div>
            </>
          )}
        </section>

        <div className="mt-6">
          <DraftControls tournament={t} />
        </div>
      </div>
    </>
  );
}
