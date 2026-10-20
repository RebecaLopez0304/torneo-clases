"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Crown, MonitorPlay } from "lucide-react";
import { championPath, matchId, roundCount, roundName } from "@/lib/bracket";
import type { Match, Team } from "@/lib/types";
import { countLabel } from "@/lib/text";
import { Shield } from "./Shield";

type Props = {
  matches: Record<string, Match>;
  teams: Team[];
  bracketSize: number;
  championId: string | null;
  activeMatchId: string | null;
  scoreUnit: string;
  /** Si existe, el admin puede mandar un partido al marcador */
  onShowMatch?: (matchId: string) => void;
};

type Slot = {
  key: string;
  match: Match;
  side: "home" | "away";
  team: Team | null;
  score: number;
};

const CHIP_H = 44; // alto de cada equipo, para centrar los conectores en la primera ronda

export function Bracket({ matches, teams, bracketSize, championId, activeMatchId, scoreUnit, onShowMatch }: Props) {
  const rounds = roundCount(bracketSize);
  const colMin = rounds >= 4 ? 136 : 150;
  const byId = new Map(teams.map((t) => [t.id, t]));
  const goldPath = championPath(matches, championId);
  const champion = championId ? (byId.get(championId) ?? null) : null;
  const [openKey, setOpenKey] = useState<string | null>(null);

  function slotsOf(round: number): Slot[] {
    const count = bracketSize / 2 ** round;
    return Array.from({ length: count }, (_, j) => {
      const match = matches[matchId(round, Math.floor(j / 2))];
      const side = j % 2 === 0 ? "home" : "away";
      const teamId = match ? (side === "home" ? match.homeId : match.awayId) : null;
      return {
        key: `${round}-${j}`,
        match,
        side,
        team: teamId ? (byId.get(teamId) ?? null) : null,
        score: match ? (side === "home" ? match.homeScore : match.awayScore) : 0,
      };
    });
  }

  const wireGold = (m: Match | undefined) => Boolean(m && (m.round === rounds - 1 || goldPath.has(m.id)));
  const chipProps = (s: Slot, placeholder: string) => ({
    slot: s,
    placeholder,
    active: s.match?.id === activeMatchId && s.match.status !== "bye",
    onPath: Boolean(championId && s.team?.id === championId),
    open: openKey === s.key,
    onToggle: () => setOpenKey((k) => (k === s.key ? null : s.key)),
    onClose: () => setOpenKey(null),
    scoreUnit,
    onShowMatch,
  });

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-x-9"
        style={{
          gridTemplateColumns: `repeat(${rounds}, minmax(${colMin}px, 1fr)) minmax(${colMin - 10}px, 0.9fr)`,
          minWidth: rounds * (colMin + 36) + colMin - 10,
        }}
      >
        {/* Encabezados de ronda */}
        {Array.from({ length: rounds }, (_, r) => (
          <p key={r} className="round-label pb-4 text-center">
            {roundName(r, rounds)}
          </p>
        ))}
        <span aria-hidden />

        {/* Primera ronda: tarjetas de partido con VS */}
        <div className="flex flex-col">
          {Array.from({ length: bracketSize / 2 }, (_, i) => {
            const [home, away] = slotsOf(0).slice(i * 2, i * 2 + 2);
            const m = home.match;
            return (
              <div key={i} className="flex min-h-[124px] flex-1 items-center">
                <div className="relative w-full">
                  <TeamChip {...chipProps(home, "Pase directo")} />
                  <p className="py-0.5 text-center font-display text-sm leading-4 font-bold text-ink-muted">VS</p>
                  <TeamChip {...chipProps(away, "Pase directo")} />
                  <Connector gold={wireGold(m)} top={CHIP_H / 2} bottom={CHIP_H / 2} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rondas siguientes: cada par de huecos es un partido */}
        {Array.from({ length: rounds - 1 }, (_, k) => {
          const r = k + 1;
          const slots = slotsOf(r);
          const placeholder = r === rounds - 1 ? "Finalista" : "Ganador";
          return (
            <div key={r} className="flex flex-col">
              {Array.from({ length: slots.length / 2 }, (_, i) => (
                <div key={i} className="relative flex flex-1 flex-col">
                  {slots.slice(i * 2, i * 2 + 2).map((s) => (
                    <div key={s.key} className="relative flex flex-1 items-center">
                      <TeamChip {...chipProps(s, placeholder)} />
                    </div>
                  ))}
                  <Connector gold={wireGold(slots[i * 2].match)} top="25%" bottom="25%" />
                </div>
              ))}
            </div>
          );
        })}

        {/* Campeón */}
        <div className="flex flex-col">
          <div className="relative flex flex-1 items-center">
            <ChampionCard champion={champion} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Corchete "]" que une los dos huecos de un partido y sale hacia la siguiente ronda. */
function Connector({ gold, top, bottom }: { gold: boolean; top: number | string; bottom: number | string }) {
  const color = gold ? "var(--gold)" : "var(--wire)";
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-full w-[18px] rounded-r-[3px] border-y-2 border-r-2"
        style={{ top, bottom, borderColor: color }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[calc(100%+18px)] w-[18px] border-t-2"
        style={{ borderColor: color }}
      />
    </>
  );
}

function TeamChip({
  slot,
  placeholder,
  active,
  onPath,
  open,
  onToggle,
  onClose,
  scoreUnit,
  onShowMatch,
}: {
  slot: Slot;
  placeholder: string;
  active: boolean;
  onPath: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  scoreUnit: string;
  onShowMatch?: (matchId: string) => void;
}) {
  const { team, match, score } = slot;
  const finished = match?.status === "finished";
  const lost = finished && team && match.winnerId !== team.id;
  const showScore = team && match && (match.status === "live" || finished) && match.homeId && match.awayId;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  if (!team) {
    return (
      <div
        className="flex w-full items-center gap-2.5 rounded-lg border border-line-soft bg-navy-850/70 px-3 text-ink-muted"
        style={{ height: CHIP_H }}
      >
        <Shield size={20} />
        <span className="truncate text-[0.95rem]">{placeholder}</span>
      </div>
    );
  }

  const canShow = onShowMatch && match && match.homeId && match.awayId && match.status !== "bye";

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={clsx(
          "flex w-full items-center gap-2.5 rounded-lg border px-3 text-left transition-colors",
          onPath
            ? "border-gold/80 bg-navy-800 shadow-[0_0_14px_rgb(244_196_48/0.25)]"
            : active
              ? "border-[#5b8cff] bg-navy-700 shadow-[0_0_14px_rgb(70_120_255/0.35)]"
              : "border-line bg-navy-800 hover:border-ink-muted",
          lost && "opacity-45",
        )}
        style={{ height: CHIP_H }}
      >
        <Shield color={team.color} size={20} glow={!lost} />
        <span className={clsx("min-w-0 flex-1 truncate text-[0.95rem] font-semibold", onPath && "text-gold-soft")}>
          {team.name}
        </span>
        {showScore && (
          <span className={clsx("font-display text-lg font-bold tabular-nums", active ? "text-ink" : "text-ink-muted")}>
            {score}
          </span>
        )}
        {active && !finished && (
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-plus-edge" aria-label="En el marcador" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 w-64 rounded-xl border border-line bg-navy-900 p-4 shadow-2xl">
          <div className="flex items-center gap-2">
            <Shield color={team.color} size={24} glow />
            <p className="font-display text-xl font-bold">{team.name}</p>
          </div>
          {team.members.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {team.members.map((m, i) => (
                <li key={i} className="text-ink">
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">Sin integrantes registrados.</p>
          )}
          {showScore && (
            <p className="mt-3 text-sm text-ink-muted">
              {countLabel(score, scoreUnit)} en este partido
            </p>
          )}
          {canShow && (
            <button
              type="button"
              className="btn btn-ghost mt-4 w-full text-sm"
              onClick={() => {
                onShowMatch!(match.id);
                onClose();
              }}
            >
              <MonitorPlay className="size-4" aria-hidden /> Llevar al marcador
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ChampionCard({ champion }: { champion: Team | null }) {
  return (
    <div
      className={clsx(
        "flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-gold bg-gold-deep/80 px-3 py-4 text-center",
        champion ? "champion-reveal" : "shadow-[0_0_18px_rgb(244_196_48/0.25)]",
      )}
    >
      <Crown className="size-6 text-gold" aria-hidden />
      {champion ? (
        <>
          <Shield color={champion.color} size={30} glow />
          <p className="font-display text-xl leading-tight font-extrabold text-gold-soft">{champion.name}</p>
          <p className="text-xs font-semibold tracking-[0.12em] text-gold uppercase">Campeón</p>
        </>
      ) : (
        <p className="font-display text-xl font-extrabold tracking-wide text-gold uppercase">Campeón</p>
      )}
    </div>
  );
}
