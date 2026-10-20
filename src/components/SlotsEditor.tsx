"use client";

import { toast } from "sonner";
import { setSlot } from "@/lib/tournaments";
import type { Tournament } from "@/lib/types";
import { DraftControls } from "./DraftControls";
import { SlotSelect } from "./SlotSelect";

export function SlotsEditor({ tournament }: { tournament: Tournament }) {
  const { teams, slots } = tournament;

  if (tournament.status !== "draft") {
    return <p className="text-ink-muted">El torneo ya empezó; los cruces están fijos.</p>;
  }
  if (teams.length < 2) {
    return <p className="text-ink-muted">Inscribe al menos 2 equipos en la pestaña Equipos para armar los cruces.</p>;
  }

  async function place(slot: number, teamId: string | null) {
    try {
      await setSlot(tournament.id, slot, teamId);
    } catch {
      toast.error("No se pudo cambiar el cruce.");
    }
  }

  return (
    <div className="space-y-6">
      <DraftControls tournament={tournament} />
      <ol className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: slots.length / 2 }, (_, m) => (
          <li key={m} className="chip p-3">
            <p className="round-label mb-2">Partido {m + 1}</p>
            <div className="space-y-1.5">
              <SlotSelect teams={teams} slots={slots} slot={m * 2} label={`Partido ${m + 1}, local`} onChange={(id) => place(m * 2, id)} />
              <p className="text-center font-display text-sm font-bold text-ink-faint">VS</p>
              <SlotSelect
                teams={teams}
                slots={slots}
                slot={m * 2 + 1}
                label={`Partido ${m + 1}, visitante`}
                onChange={(id) => place(m * 2 + 1, id)}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
