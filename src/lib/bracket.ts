import type { Match, TimerState } from "./types";

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 16;

/** Devuelve un entero uniforme en [0, max). */
export type Rng = (max: number) => number;

/** Aleatorio criptográfico sin sesgo de módulo (muestreo por rechazo). */
export const secureRandomInt: Rng = (max) => {
  if (max <= 1) return 0;
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
};

export function shuffle<T>(items: readonly T[], rng: Rng = secureRandomInt): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Siguiente potencia de 2 ≥ n (mínimo 2). */
export function bracketSizeFor(teamCount: number): number {
  let size = 2;
  while (size < teamCount) size *= 2;
  return size;
}

export function roundCount(size: number): number {
  return Math.log2(size);
}

export function matchId(round: number, index: number) {
  return `r${round}m${index}`;
}

export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - round;
  return ["Gran final", "Semifinales", "Cuartos de final", "Octavos de final"][fromEnd] ?? `Ronda ${round + 1}`;
}

// ───────────────────────── Preparación (cruces) ─────────────────────────

/** Sorteo totalmente aleatorio: orden de equipos y posición de los pases directos. */
export function drawSlots(teamIds: readonly string[], rng: Rng = secureRandomInt): (string | null)[] {
  const size = bracketSizeFor(teamIds.length);
  const matches = size / 2;
  const byes = size - teamIds.length;
  const byeMatches = new Set(shuffle([...Array(matches).keys()], rng).slice(0, byes));
  const queue = shuffle(teamIds, rng);
  const slots: (string | null)[] = [];
  for (let m = 0; m < matches; m++) {
    if (byeMatches.has(m)) {
      // El equipo con pase directo cae al azar como local o visitante.
      const team = queue.shift()!;
      slots.push(...(rng(2) === 0 ? [team, null] : [null, team]));
    } else {
      slots.push(queue.shift()!, queue.shift()!);
    }
  }
  return slots;
}

/** Acomodo inicial (sin sortear) en orden de inscripción, sin dobles pases directos. */
export function orderedSlots(teamIds: readonly string[]): (string | null)[] {
  const size = bracketSizeFor(teamIds.length);
  const matches = size / 2;
  const slots: (string | null)[] = Array(size).fill(null);
  teamIds.forEach((id, i) => {
    if (i < matches) slots[i * 2] = id;
    else slots[(i - matches) * 2 + 1] = id;
  });
  return slots;
}

/**
 * Coloca un equipo (o un pase directo) en un hueco de la primera ronda.
 * Si el equipo ya estaba en otro hueco, intercambia ambos para que nunca haya duplicados.
 */
export function placeInSlot(slots: readonly (string | null)[], slot: number, teamId: string | null) {
  const next = slots.slice();
  const from = teamId ? next.indexOf(teamId) : -1;
  if (from === slot) return next;
  if (from >= 0) next[from] = next[slot];
  next[slot] = teamId;
  return next;
}

/** Ajusta los cruces cuando cambia la lista de equipos. */
export function syncSlots(slots: readonly (string | null)[], teamIds: readonly string[]): (string | null)[] {
  const size = bracketSizeFor(teamIds.length);
  if (slots.length !== size) return orderedSlots(teamIds);
  const valid = new Set(teamIds);
  const next = slots.map((s) => (s && valid.has(s) ? s : null));
  for (const id of teamIds) {
    if (next.includes(id)) continue;
    // Preferir un hueco cuyo rival ya sea un equipo, para no crear dobles pases directos.
    let free = next.findIndex((s, i) => s === null && next[i ^ 1] !== null);
    if (free < 0) free = next.indexOf(null);
    next[free] = id;
  }
  // Al quitar equipos puede quedar un partido sin nadie: se mueve ahí un equipo de un partido completo.
  for (let m = 0; m < size / 2; m++) {
    if (next[m * 2] !== null || next[m * 2 + 1] !== null) continue;
    const full = [...Array(size / 2).keys()].find((k) => next[k * 2] !== null && next[k * 2 + 1] !== null);
    if (full === undefined) break;
    next[m * 2] = next[full * 2 + 1];
    next[full * 2 + 1] = null;
  }
  return next;
}

export type SlotProblem = { kind: "unplaced"; teamId: string } | { kind: "double-bye"; match: number } | { kind: "size" };

export function validateSlots(slots: readonly (string | null)[], teamIds: readonly string[]): SlotProblem[] {
  const problems: SlotProblem[] = [];
  if (teamIds.length < MIN_TEAMS || teamIds.length > MAX_TEAMS || slots.length !== bracketSizeFor(teamIds.length)) {
    return [{ kind: "size" }];
  }
  for (const id of teamIds) if (!slots.includes(id)) problems.push({ kind: "unplaced", teamId: id });
  for (let m = 0; m < slots.length / 2; m++) {
    if (slots[m * 2] === null && slots[m * 2 + 1] === null) problems.push({ kind: "double-bye", match: m });
  }
  return problems;
}

// ───────────────────────── Torneo en curso ─────────────────────────

export function newTimer(durationSec: number): TimerState {
  const ms = durationSec * 1000;
  return { durationMs: ms, remainingMs: ms, runningSince: null };
}

function emptyMatch(round: number, index: number, durationSec: number): Match {
  return {
    id: matchId(round, index),
    round,
    index,
    homeId: null,
    awayId: null,
    homeScore: 0,
    awayScore: 0,
    status: "pending",
    winnerId: null,
    periodLabel: "Ronda 1",
    timer: newTimer(durationSec),
  };
}

function nextOf(m: Pick<Match, "round" | "index">): { id: string; side: "homeId" | "awayId" } {
  return { id: matchId(m.round + 1, Math.floor(m.index / 2)), side: m.index % 2 === 0 ? "homeId" : "awayId" };
}

/** Crea todos los partidos a partir de los cruces y adelanta a los equipos con pase directo. */
export function buildMatches(slots: readonly (string | null)[], roundDurationSec: number): Record<string, Match> {
  const rounds = roundCount(slots.length);
  const matches: Record<string, Match> = {};
  for (let r = 0; r < rounds; r++) {
    const count = slots.length / 2 ** (r + 1);
    for (let i = 0; i < count; i++) matches[matchId(r, i)] = emptyMatch(r, i, roundDurationSec);
  }
  for (let i = 0; i < slots.length / 2; i++) {
    const m = matches[matchId(0, i)];
    m.homeId = slots[i * 2];
    m.awayId = slots[i * 2 + 1];
    if ((m.homeId === null) !== (m.awayId === null)) {
      m.status = "bye";
      m.winnerId = m.homeId ?? m.awayId;
      if (rounds > 1) {
        const next = nextOf(m);
        matches[next.id][next.side] = m.winnerId;
      }
    }
  }
  return matches;
}

export function isFinalRound(m: Pick<Match, "round">, matches: Record<string, Match>) {
  return !matches[matchId(m.round + 1, 0)];
}

export type FinalizeResult = { matches: Record<string, Match>; championId: string | null };

/**
 * Cierra un partido. Gana quien tenga más puntos; en empate hay que indicar el ganador.
 * Devuelve los partidos actualizados y el campeón si era la final.
 */
export function finalizeMatch(
  matches: Record<string, Match>,
  id: string,
  tieWinnerId?: string | null,
  now = Date.now(),
): FinalizeResult {
  const m = matches[id];
  if (!m) throw new Error("Partido inexistente");
  if (!m.homeId || !m.awayId) throw new Error("Faltan equipos en este partido");
  if (m.status === "finished" || m.status === "bye") throw new Error("El partido ya terminó");

  let winnerId: string;
  if (m.homeScore !== m.awayScore) winnerId = m.homeScore > m.awayScore ? m.homeId : m.awayId;
  else if (tieWinnerId === m.homeId || tieWinnerId === m.awayId) winnerId = tieWinnerId;
  else throw new Error("Empate: elige quién avanza");

  const next = structuredClone(matches);
  const done = next[id];
  done.status = "finished";
  done.winnerId = winnerId;
  done.timer = { ...done.timer, remainingMs: remainingMs(done.timer, now), runningSince: null };

  if (isFinalRound(done, next)) return { matches: next, championId: winnerId };
  const target = nextOf(done);
  next[target.id][target.side] = winnerId;
  return { matches: next, championId: null };
}

/** Se puede reabrir si el partido siguiente aún no se ha jugado. */
export function canReopen(matches: Record<string, Match>, id: string): boolean {
  const m = matches[id];
  if (!m || m.status !== "finished") return false;
  if (isFinalRound(m, matches)) return true;
  const following = matches[nextOf(m).id];
  return following.status === "pending" && following.homeScore === 0 && following.awayScore === 0;
}

export function reopenMatch(matches: Record<string, Match>, id: string): Record<string, Match> {
  if (!canReopen(matches, id)) throw new Error("El siguiente partido ya empezó; no se puede reabrir");
  const next = structuredClone(matches);
  const m = next[id];
  m.status = "live";
  m.winnerId = null;
  if (!isFinalRound(m, next)) {
    const target = nextOf(m);
    next[target.id][target.side] = null;
  }
  return next;
}

/** Ids de los partidos que ganó el campeón (para iluminar su camino). */
export function championPath(matches: Record<string, Match>, championId: string | null): Set<string> {
  const ids = new Set<string>();
  if (!championId) return ids;
  for (const m of Object.values(matches)) if (m.winnerId === championId) ids.add(m.id);
  return ids;
}

export function matchesByRound(matches: Record<string, Match>): Match[][] {
  const rounds: Match[][] = [];
  for (const m of Object.values(matches)) (rounds[m.round] ??= []).push(m);
  return rounds.map((r) => r.sort((a, b) => a.index - b.index));
}

// ───────────────────────── Reloj ─────────────────────────

export function remainingMs(timer: TimerState, now: number): number {
  if (timer.runningSince === null) return timer.remainingMs;
  return Math.max(0, timer.remainingMs - (now - timer.runningSince));
}

export function startTimer(timer: TimerState, now: number): TimerState {
  if (timer.runningSince !== null || timer.remainingMs <= 0) return timer;
  return { ...timer, runningSince: now };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.runningSince === null) return timer;
  return { ...timer, remainingMs: remainingMs(timer, now), runningSince: null };
}

export function resetTimer(timer: TimerState, durationMs = timer.durationMs): TimerState {
  return { durationMs, remainingMs: durationMs, runningSince: null };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
