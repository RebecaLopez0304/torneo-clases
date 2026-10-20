"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Settings, Trophy } from "lucide-react";
import { toast } from "sonner";
import { buildMatches } from "@/lib/bracket";
import { setActiveMatch } from "@/lib/tournaments";
import type { Tournament } from "@/lib/types";
import { Bracket } from "./Bracket";
import { DraftSetup } from "./DraftSetup";
import { Scoreboard } from "./Scoreboard";
import { TournamentHeader } from "./TournamentHeader";
import { WaitingScreen } from "./WaitingScreen";

/** Pantalla principal del torneo: eliminatorias a la izquierda y marcador en vivo a la derecha. */
export function TournamentView({ tournament: t, canEdit }: { tournament: Tournament; canEdit: boolean }) {
  const draft = t.status === "draft";
  const [draftMatch, setDraftMatch] = useState(0);
  // En preparación el cuadro es una vista previa armada con los cruces actuales.
  const matches = useMemo(
    () => (draft ? buildMatches(t.slots, t.roundDurationSec) : t.matches),
    [draft, t.slots, t.roundDurationSec, t.matches],
  );

  if (draft && !canEdit) {
    return (
      <>
        <TournamentHeader name={t.name} subtitle={t.subtitle} />
        <div className="px-4">
          <WaitingScreen teamCount={t.teams.length} />
        </div>
      </>
    );
  }

  async function show(matchId: string) {
    if (draft) return setDraftMatch(Number(matchId.split("m")[1]));
    try {
      await setActiveMatch(t.id, matchId);
    } catch {
      toast.error("No se pudo cambiar de partido.");
    }
  }

  return (
    <>
      <TournamentHeader name={t.name} subtitle={t.subtitle} />
      <div className="mx-auto max-w-[1500px] px-3 pb-12 sm:px-6">
        <div
          className={clsx(
            "panel grid gap-3 p-2 sm:gap-4 sm:p-4",
            // Con 16 equipos el cuadro necesita más ancho: lado a lado solo en pantallas grandes.
            t.bracketSize >= 16 ? "xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]",
          )}
        >
          <section className="panel min-w-0 overflow-hidden" aria-label="Eliminatorias">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
              <h2 className="panel-title flex min-w-0 items-center gap-2 text-xl whitespace-nowrap sm:gap-3 sm:text-3xl">
                <Trophy className="size-6 shrink-0 text-gold sm:size-7" aria-hidden /> Eliminatorias
              </h2>
              {canEdit && (
                <Link href={`/t/${t.id}/configurar`} className="btn btn-ghost shrink-0 px-3 text-sm">
                  <Settings className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Configurar</span>
                </Link>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {t.teams.length < 2 ? (
                <div className="py-12 text-center text-ink-muted">
                  <p>Aún no hay equipos suficientes para el cuadro.</p>
                  {canEdit && (
                    <Link href={`/t/${t.id}/configurar?tab=equipos`} className="btn btn-gold mt-4">
                      Inscribir equipos
                    </Link>
                  )}
                </div>
              ) : (
                <Bracket
                  matches={matches}
                  teams={t.teams}
                  bracketSize={draft ? t.slots.length : t.bracketSize}
                  championId={t.championId}
                  activeMatchId={draft ? `r0m${draftMatch}` : t.activeMatchId}
                  scoreUnit={t.scoreUnit}
                  onShowMatch={canEdit ? show : undefined}
                />
              )}
            </div>
          </section>

          <section className="panel @container min-w-0 overflow-hidden" aria-label="Marcador en vivo">
            {draft ? (
              <DraftSetup tournament={t} selected={draftMatch} onSelect={setDraftMatch} />
            ) : (
              <Scoreboard tournament={t} canEdit={canEdit} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
