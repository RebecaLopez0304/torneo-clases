"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChartNoAxesColumnIncreasing, Settings, Trophy } from "lucide-react";
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
  // En celular se muestra un panel a la vez; el marcador primero porque ahí están los controles.
  const [panel, setPanel] = useState<"cuadro" | "marcador">("marcador");
  const wide = t.bracketSize >= 16;
  const onlyWhen = (p: typeof panel) => panel !== p && (wide ? "hidden xl:block" : "hidden lg:block");
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
    setPanel("marcador");
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
          role="tablist"
          aria-label="Panel visible"
          className={clsx(
            "panel sticky top-2 z-20 mb-3 grid grid-cols-2 gap-1 p-1",
            wide ? "xl:hidden" : "lg:hidden",
          )}
        >
          {(
            [
              ["cuadro", "Eliminatorias", Trophy],
              ["marcador", "Marcador", ChartNoAxesColumnIncreasing],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panel === id}
              onClick={() => {
                setPanel(id);
                window.scrollTo({ top: 0 });
              }}
              className={clsx(
                "flex h-11 items-center justify-center gap-2 rounded-[10px] font-display text-lg font-bold uppercase",
                panel === id ? "bg-gold text-navy-950" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="size-5" aria-hidden /> {label}
            </button>
          ))}
        </div>
        <div
          className={clsx(
            "panel grid gap-3 p-2 sm:gap-4 sm:p-4",
            // Con 16 equipos el cuadro necesita más ancho: lado a lado solo en pantallas grandes.
            wide ? "xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]",
          )}
        >
          <section className={clsx("panel min-w-0 overflow-hidden", onlyWhen("cuadro"))} aria-label="Eliminatorias">
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

          <section
            className={clsx("panel @container min-w-0 overflow-hidden", onlyWhen("marcador"))}
            aria-label="Marcador en vivo"
          >
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
