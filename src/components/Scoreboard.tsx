"use client";

import { useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  ChartNoAxesColumnIncreasing,
  Check,
  Clock,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
  Undo2,
} from "lucide-react";
import { canReopen, formatClock, remainingMs, roundCount, roundName } from "@/lib/bracket";
import { useServerNow } from "@/lib/serverTime";
import {
  changeScore,
  finishMatch,
  nextPlayableMatch,
  reopen,
  setActiveMatch,
  setPeriodLabel,
  timerAction,
  type TimerAction,
} from "@/lib/tournaments";
import type { Match, Team, Tournament } from "@/lib/types";
import { countLabel } from "@/lib/text";
import { Dialog } from "./Dialog";
import { Shield } from "./Shield";


async function attempt(action: () => Promise<unknown>, fallback: string) {
  try {
    await action();
    return true;
  } catch (err) {
    toast.error(err instanceof Error && err.message ? err.message : fallback);
    return false;
  }
}

export function ScoreboardHeader({ onPick }: { onPick?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
      <h2 className="panel-title flex min-w-0 items-center gap-2 text-xl whitespace-nowrap @md:gap-3 @md:text-3xl">
        <ChartNoAxesColumnIncreasing className="size-6 shrink-0 text-gold @md:size-7" strokeWidth={3} aria-hidden />
        Marcador en vivo
      </h2>
      {onPick && (
        <button type="button" onClick={onPick} className="btn btn-ghost shrink-0 px-3 text-sm uppercase">
          <Trophy className="size-4 text-gold" aria-hidden /> <span className="sr-only @xl:not-sr-only">Eliminatorias</span>
        </button>
      )}
    </div>
  );
}

export function Scoreboard({ tournament: t, canEdit }: { tournament: Tournament; canEdit: boolean }) {
  const [picking, setPicking] = useState(false);
  const match = t.activeMatchId ? t.matches[t.activeMatchId] : null;
  const teams = new Map(t.teams.map((x) => [x.id, x]));

  return (
    <>
      <ScoreboardHeader onPick={canEdit ? () => setPicking(true) : undefined} />
      {match && match.homeId && match.awayId ? (
        <LiveMatch
          key={match.id}
          t={t}
          match={match}
          home={teams.get(match.homeId)!}
          away={teams.get(match.awayId)!}
          canEdit={canEdit}
        />
      ) : (
        <div className="px-6 py-16 text-center text-ink-muted">
          {t.status === "finished"
            ? "El torneo terminó. ¡Felicidades al campeón!"
            : canEdit
              ? "Elige un partido en Eliminatorias para mostrarlo aquí."
              : "En un momento empieza el siguiente partido."}
        </div>
      )}
      {canEdit && <MatchPicker t={t} open={picking} onClose={() => setPicking(false)} />}
    </>
  );
}

function LiveMatch({
  t,
  match,
  home,
  away,
  canEdit,
}: {
  t: Tournament;
  match: Match;
  home: Team;
  away: Team;
  canEdit: boolean;
}) {
  const rounds = roundCount(t.bracketSize);
  const finished = match.status === "finished";
  const editable = canEdit && !finished;
  const [finalizing, setFinalizing] = useState(false);

  const score = (side: "home" | "away", delta: number) =>
    attempt(() => changeScore(t.id, match.id, side, delta), "No se pudo cambiar el marcador.");

  return (
    <div className="px-4 pt-4 pb-5 sm:px-6">
      <p className="text-center text-sm leading-6 font-semibold tracking-[0.14em] text-ink-muted uppercase">
        {roundName(match.round, rounds)}
        <br />
        {t.name}
      </p>

      {/* Equipos y marcador */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide team={home} />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 sm:gap-6">
            <BigScore value={match.homeScore} dim={finished && match.winnerId !== home.id} />
            <span className="font-display text-xl font-bold text-ink-muted">VS</span>
            <BigScore value={match.awayScore} dim={finished && match.winnerId !== away.id} />
          </div>
          <p className="mt-1 text-sm font-semibold tracking-[0.18em] text-ink-muted uppercase">{t.scoreUnit}</p>
        </div>
        <TeamSide team={away} />
      </div>

      {/* Botones de puntos */}
      {editable && (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-3">
          <ScoreButtons steps={t.scoreSteps} unit={t.scoreUnit} name={home.name} onChange={(d) => score("home", d)} />
          <span className="w-px bg-line-soft" aria-hidden />
          <ScoreButtons steps={t.scoreSteps} unit={t.scoreUnit} name={away.name} onChange={(d) => score("away", d)} />
        </div>
      )}

      <MatchTimer t={t} match={match} canEdit={editable} />

      {/* Resultado / acciones del partido */}
      {canEdit && (
        <MatchActions t={t} match={match} home={home} away={away} onFinalize={() => setFinalizing(true)} />
      )}
      {!canEdit && finished && (
        <p className="mt-4 text-center font-semibold text-gold">
          Avanza {match.winnerId === home.id ? home.name : away.name}
        </p>
      )}

      <section className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold uppercase">Enfrentamiento</h3>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <ReadonlyTeam label="Equipo local" team={home} />
          <ReadonlyTeam label="Equipo visitante" team={away} />
        </div>
      </section>

      <FinalizeDialog
        open={finalizing}
        onClose={() => setFinalizing(false)}
        t={t}
        match={match}
        home={home}
        away={away}
      />
    </div>
  );
}

function TeamSide({ team }: { team: Team }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <Shield color={team.color} size={64} glow className="sm:hidden" />
      <Shield color={team.color} size={84} glow className="hidden sm:block" />
      <p className="w-full truncate font-display text-xl font-bold sm:text-2xl">{team.name}</p>
    </div>
  );
}

function BigScore({ value, dim }: { value: number; dim?: boolean }) {
  return (
    <span
      key={value}
      className={clsx(
        "score-pop inline-block min-w-[1ch] text-center font-display text-7xl leading-none font-extrabold tabular-nums sm:text-8xl",
        dim ? "text-ink-faint" : "text-ink drop-shadow-[0_2px_12px_rgb(140_180_255/0.35)]",
      )}
    >
      {value}
    </span>
  );
}

function ScoreButtons({
  steps,
  unit,
  name,
  onChange,
}: {
  steps: number[];
  unit: string;
  name: string;
  onChange: (delta: number) => void;
}) {
  const label = (n: number) => countLabel(n, unit);
  // Con un solo incremento: "+ 1 punto" / "− 1 punto" como en la propuesta; con varios, solo el número.
  const text = (n: number) => (steps.length === 1 ? label(n) : String(n));
  const row = (sign: 1 | -1) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${sign > 0 ? "Sumar" : "Restar"} ${label(n)} a ${name}`}
          onClick={() => onChange(sign * n)}
          className={clsx(
            "flex h-11 items-center justify-center gap-2 rounded-full border font-semibold active:scale-[0.98]",
            sign > 0
              ? "border-plus-edge/70 bg-plus text-white hover:brightness-110"
              : "border-minus-edge/70 bg-minus text-[#ffd6e4] hover:brightness-125",
          )}
        >
          <span className={clsx("text-xl leading-none", sign < 0 && "text-[#ff5c93]")}>{sign > 0 ? "+" : "−"}</span>
          {text(n)}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-2">
      {row(1)}
      {row(-1)}
    </div>
  );
}

function MatchTimer({ t, match, canEdit }: { t: Tournament; match: Match; canEdit: boolean }) {
  const running = match.timer.runningSince !== null;
  const now = useServerNow(running);
  const left = remainingMs(match.timer, now);
  const over = left <= 0;
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState(match.periodLabel);

  const act = (a: TimerAction) => attempt(() => timerAction(t.id, match.id, a), "No se pudo cambiar el reloj.");

  async function savePeriod() {
    setEditing(false);
    const value = period.trim() || "Ronda 1";
    if (value !== match.periodLabel) await attempt(() => setPeriodLabel(t.id, match.id, value), "No se pudo guardar.");
  }

  return (
    <section className="mt-5 rounded-2xl border border-line bg-navy-950/40 px-4 py-4">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold tracking-[0.14em] text-ink-muted uppercase">
        <Clock className="size-5" aria-hidden /> Tiempo del partido
      </p>
      <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        {canEdit ? (
          <button
            type="button"
            onClick={() => act(running ? "pause" : "start")}
            disabled={!running && over}
            aria-label={running ? "Pausar reloj" : "Iniciar reloj"}
            className="grid size-16 place-items-center rounded-full border-[3px] border-gold text-gold hover:bg-gold/10 disabled:opacity-40 sm:size-[72px]"
          >
            {running ? <Pause className="size-7" fill="currentColor" /> : <Play className="size-7 translate-x-0.5" fill="currentColor" />}
          </button>
        ) : (
          <span className="size-16 sm:size-[72px]" aria-hidden />
        )}

        <div className="text-center">
          <p
            className={clsx(
              "font-display text-6xl leading-none font-extrabold tabular-nums sm:text-7xl",
              over ? "animate-pulse text-[#ff5c93]" : "text-ink",
            )}
            role="timer"
            aria-live="off"
          >
            {formatClock(left)}
          </p>
          {editing ? (
            <input
              autoFocus
              className="field mx-auto mt-2 h-8 max-w-40 py-0 text-center text-sm"
              value={period}
              maxLength={20}
              aria-label="Nombre del periodo"
              onChange={(e) => setPeriod(e.target.value)}
              onBlur={savePeriod}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold tracking-[0.14em] text-ink-muted uppercase">
              {over ? <span className="text-[#ff5c93]">¡Tiempo!</span> : match.periodLabel}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setPeriod(match.periodLabel);
                    setEditing(true);
                  }}
                  aria-label="Cambiar nombre del periodo"
                  className="rounded p-1 text-ink-faint hover:text-gold"
                >
                  <Pencil className="size-3.5" aria-hidden />
                </button>
              )}
            </p>
          )}
        </div>

        {canEdit ? (
          <button type="button" onClick={() => act("reset")} className="flex flex-col items-center gap-1 text-xs text-ink">
            <span className="grid size-12 place-items-center rounded-full border-2 border-line hover:border-ink-muted sm:size-14">
              <RotateCcw className="size-5" aria-hidden />
            </span>
            Reiniciar
          </button>
        ) : (
          <span className="size-12 sm:size-14" aria-hidden />
        )}
      </div>
    </section>
  );
}

function MatchActions({
  t,
  match,
  home,
  away,
  onFinalize,
}: {
  t: Tournament;
  match: Match;
  home: Team;
  away: Team;
  onFinalize: () => void;
}) {
  const next = nextPlayableMatch(t);
  const finished = match.status === "finished";
  const winner = match.winnerId === home.id ? home : away;

  if (!finished) {
    return (
      <button type="button" onClick={onFinalize} className="btn btn-gold mt-4 w-full">
        <Check className="size-4" aria-hidden /> Finalizar partido
      </button>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-gold/50 bg-gold-deep/30 p-3">
      <p className="text-center font-semibold text-gold">
        {t.championId ? `¡${winner.name} es campeón!` : `Avanza ${winner.name}`}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {canReopen(t.matches, match.id) && (
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => attempt(() => reopen(t.id, match.id), "No se pudo reabrir el partido.")}
          >
            <Undo2 className="size-4" aria-hidden /> Reabrir partido
          </button>
        )}
        {next && (
          <button
            type="button"
            className="btn btn-gold text-sm"
            onClick={() => attempt(() => setActiveMatch(t.id, next.id), "No se pudo cambiar de partido.")}
          >
            <SkipForward className="size-4" aria-hidden /> Siguiente partido
          </button>
        )}
      </div>
    </div>
  );
}

function ReadonlyTeam({ label, team }: { label: string; team: Team }) {
  return (
    <div>
      <p className="mb-1 text-sm text-ink-muted">{label}</p>
      <div className="flex h-12 items-center gap-2.5 rounded-lg border border-line bg-navy-900 px-3">
        <Shield color={team.color} size={22} glow />
        <span className="truncate font-semibold">{team.name}</span>
      </div>
    </div>
  );
}

function FinalizeDialog({
  open,
  onClose,
  t,
  match,
  home,
  away,
}: {
  open: boolean;
  onClose: () => void;
  t: Tournament;
  match: Match;
  home: Team;
  away: Team;
}) {
  const tie = match.homeScore === match.awayScore;
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rounds = roundCount(t.bracketSize);
  const isFinal = match.round === rounds - 1;
  const leader = match.homeScore > match.awayScore ? home : away;

  async function confirm() {
    setBusy(true);
    const ok = await attempt(
      () => finishMatch(t.id, match.id, tie ? (choice ?? undefined) : undefined),
      "No se pudo finalizar el partido.",
    );
    setBusy(false);
    if (ok) {
      setChoice(null);
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={tie ? "Empate: ¿quién avanza?" : "Finalizar partido"}>
      {tie ? (
        <>
          <p className="text-ink-muted">
            Empate a {match.homeScore}. Elige el equipo que {isFinal ? "gana la final" : "pasa a la siguiente ronda"}.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[home, away].map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={choice === x.id}
                onClick={() => setChoice(x.id)}
                className={clsx(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4",
                  choice === x.id ? "border-gold bg-gold/10" : "border-line bg-navy-900 hover:border-ink-muted",
                )}
              >
                <Shield color={x.color} size={40} glow />
                <span className="font-display text-lg font-bold">{x.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-ink-muted">
          <strong className="text-ink">{leader.name}</strong> gana {Math.max(match.homeScore, match.awayScore)} a{" "}
          {Math.min(match.homeScore, match.awayScore)}
          {isFinal ? " y se corona campeón." : ` y avanza a ${roundName(match.round + 1, rounds).toLowerCase()}.`}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-gold" disabled={busy || (tie && !choice)} onClick={confirm}>
          Finalizar partido
        </button>
      </div>
    </Dialog>
  );
}

function MatchPicker({ t, open, onClose }: { t: Tournament; open: boolean; onClose: () => void }) {
  const rounds = roundCount(t.bracketSize);
  const teams = new Map(t.teams.map((x) => [x.id, x]));
  const list = Object.values(t.matches)
    .filter((m) => m.status !== "bye")
    .sort((a, b) => a.round - b.round || a.index - b.index);

  return (
    <Dialog open={open} onClose={onClose} title="Elegir partido">
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {list.map((m) => {
          const h = m.homeId ? teams.get(m.homeId) : null;
          const a = m.awayId ? teams.get(m.awayId) : null;
          const ready = Boolean(h && a);
          const active = m.id === t.activeMatchId;
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={!ready}
                onClick={async () => {
                  if (await attempt(() => setActiveMatch(t.id, m.id), "No se pudo cambiar de partido.")) onClose();
                }}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left disabled:opacity-50",
                  active ? "border-gold bg-gold/10" : "border-line bg-navy-900 hover:border-ink-muted",
                )}
              >
                <span className="w-24 shrink-0 text-xs font-semibold text-ink-muted uppercase">
                  {roundName(m.round, rounds)}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-semibold">
                  <Shield color={h?.color} size={16} /> {h?.name ?? "Por definir"}
                  <span className="text-ink-faint">vs</span>
                  <Shield color={a?.color} size={16} /> {a?.name ?? "Por definir"}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {m.status === "finished" ? `${m.homeScore}–${m.awayScore}` : m.status === "live" ? "En juego" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
