"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  type DocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  buildMatches,
  bracketSizeFor,
  drawSlots,
  finalizeMatch,
  pauseTimer,
  placeInSlot,
  reopenMatch,
  resetTimer,
  startTimer,
  syncSlots,
  validateSlots,
} from "./bracket";
import { db } from "./firebase";
import { serverNow } from "./serverTime";
import type { Match, Team, Tournament } from "./types";

type TournamentData = Omit<Tournament, "id">;
export type GeneralSettings = Pick<Tournament, "name" | "subtitle" | "scoreUnit" | "scoreSteps" | "roundDurationSec">;

const col = () => collection(db(), "tournaments");
const ref = (id: string) => doc(db(), "tournaments", id);

function fromSnap(snap: DocumentSnapshot): Tournament | null {
  if (!snap.exists()) return null;
  const d = snap.data() as Partial<TournamentData>;
  return {
    id: snap.id,
    name: d.name ?? "Torneo",
    subtitle: d.subtitle ?? "",
    status: d.status ?? "draft",
    scoreUnit: d.scoreUnit ?? "puntos",
    scoreSteps: d.scoreSteps?.length ? d.scoreSteps : [1],
    roundDurationSec: d.roundDurationSec ?? 300,
    teams: d.teams ?? [],
    bracketSize: d.bracketSize ?? 2,
    slots: d.slots ?? [null, null],
    drawnAt: d.drawnAt ?? null,
    matches: d.matches ?? {},
    activeMatchId: d.activeMatchId ?? null,
    championId: d.championId ?? null,
    createdBy: d.createdBy ?? "",
    createdAt: d.createdAt ?? 0,
    updatedAt: d.updatedAt ?? 0,
  };
}

// ───────────────────────── Lectura en tiempo real ─────────────────────────

export function useTournaments() {
  const [list, setList] = useState<Tournament[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(
    () =>
      onSnapshot(
        query(col(), orderBy("createdAt", "desc")),
        (snap) => setList(snap.docs.map((d) => fromSnap(d)!)),
        () => setError(true),
      ),
    [],
  );
  return { list, error };
}

export function useTournament(id: string) {
  const [state, setState] = useState<{ tournament: Tournament | null; loading: boolean; error: boolean }>({
    tournament: null,
    loading: true,
    error: false,
  });
  useEffect(
    () =>
      onSnapshot(
        ref(id),
        (snap) => setState({ tournament: fromSnap(snap), loading: false, error: false }),
        () => setState({ tournament: null, loading: false, error: true }),
      ),
    [id],
  );
  return state;
}

// ───────────────────────── Escritura ─────────────────────────

/** Lee el torneo, aplica el cambio y lo guarda en una sola transacción. */
async function mutate(id: string, change: (t: Tournament) => Partial<TournamentData>) {
  await runTransaction(db(), async (tx) => {
    const t = fromSnap(await tx.get(ref(id)));
    if (!t) throw new Error("El torneo ya no existe");
    tx.update(ref(id), { ...change(t), updatedAt: Date.now() });
  });
}

export async function createTournament(settings: GeneralSettings, uid: string): Promise<string> {
  const now = Date.now();
  const data: TournamentData = {
    ...settings,
    status: "draft",
    teams: [],
    bracketSize: 2,
    slots: [null, null],
    drawnAt: null,
    matches: {},
    activeMatchId: null,
    championId: null,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  };
  const created = await addDoc(col(), data);
  return created.id;
}

export const deleteTournament = (id: string) => deleteDoc(ref(id));

export const updateGeneral = (id: string, settings: GeneralSettings) => mutate(id, () => settings);

export const saveTeams = (id: string, teams: Team[]) =>
  mutate(id, (t) => {
    // Con el torneo en curso solo se pueden editar nombre, color e integrantes.
    if (t.status !== "draft") {
      const byId = new Map(teams.map((x) => [x.id, x]));
      return { teams: t.teams.map((old) => byId.get(old.id) ?? old) };
    }
    const teamIds = teams.map((x) => x.id);
    const size = bracketSizeFor(teamIds.length);
    return {
      teams,
      bracketSize: size,
      slots: syncSlots(t.slots, teamIds),
      drawnAt: size === t.bracketSize ? t.drawnAt : null,
    };
  });

export const drawBracket = (id: string) =>
  mutate(id, (t) => {
    if (t.status !== "draft") throw new Error("El torneo ya empezó");
    return { slots: drawSlots(t.teams.map((x) => x.id)), drawnAt: Date.now() };
  });

export const setSlot = (id: string, slot: number, teamId: string | null) =>
  mutate(id, (t) => {
    if (t.status !== "draft") throw new Error("El torneo ya empezó");
    return { slots: placeInSlot(t.slots, slot, teamId) };
  });

export const startTournament = (id: string) =>
  mutate(id, (t) => {
    if (t.status !== "draft") throw new Error("El torneo ya empezó");
    const problems = validateSlots(t.slots, t.teams.map((x) => x.id));
    if (problems.length) throw new Error("Revisa los cruces antes de iniciar");
    const matches = buildMatches(t.slots, t.roundDurationSec);
    const first = Object.values(matches).find((m) => m.round === 0 && m.status === "pending") ?? null;
    return { status: "live", matches, activeMatchId: first?.id ?? null, championId: null };
  });

/** Vuelve a preparación: borra resultados y conserva equipos y cruces. */
export const backToDraft = (id: string) =>
  mutate(id, () => ({ status: "draft", matches: {}, activeMatchId: null, championId: null }));

// ───────────────────────── Partido en vivo ─────────────────────────

function updateMatch(id: string, matchId: string, change: (m: Match, t: Tournament) => Partial<Match>) {
  return mutate(id, (t) => {
    const m = t.matches[matchId];
    if (!m) throw new Error("Partido inexistente");
    return { matches: { ...t.matches, [matchId]: { ...m, ...change(m, t) } } };
  });
}

export const setActiveMatch = (id: string, matchId: string) =>
  mutate(id, (t) => {
    const m = t.matches[matchId];
    if (!m) throw new Error("Partido inexistente");
    const matches =
      m.status === "pending" && m.homeId && m.awayId
        ? { ...t.matches, [matchId]: { ...m, status: "live" as const } }
        : t.matches;
    return { activeMatchId: matchId, matches };
  });

export const changeScore = (id: string, matchId: string, side: "home" | "away", delta: number) =>
  updateMatch(id, matchId, (m) => {
    if (m.status === "finished" || m.status === "bye") throw new Error("El partido ya terminó");
    if (!m.homeId || !m.awayId) throw new Error("Faltan equipos en este partido");
    const key = side === "home" ? "homeScore" : "awayScore";
    return { [key]: Math.max(0, m[key] + delta), status: "live" };
  });

export type TimerAction = "start" | "pause" | "reset";

export const timerAction = (id: string, matchId: string, action: TimerAction) =>
  updateMatch(id, matchId, (m, t) => {
    const now = serverNow();
    if (action === "start") return { timer: startTimer(m.timer, now), status: m.status === "pending" ? "live" : m.status };
    if (action === "pause") return { timer: pauseTimer(m.timer, now) };
    return { timer: resetTimer(m.timer, t.roundDurationSec * 1000) };
  });

export const setPeriodLabel = (id: string, matchId: string, periodLabel: string) =>
  updateMatch(id, matchId, () => ({ periodLabel }));

export const finishMatch = (id: string, matchId: string, tieWinnerId?: string) =>
  mutate(id, (t) => {
    const { matches, championId } = finalizeMatch(t.matches, matchId, tieWinnerId, serverNow());
    // El marcador se queda en este partido para que todos vean el resultado.
    return championId ? { matches, championId, status: "finished" } : { matches };
  });

/** Siguiente partido listo para jugarse (ambos equipos definidos y sin terminar). */
export function nextPlayableMatch(t: Tournament): Match | null {
  return (
    Object.values(t.matches)
      .sort((a, b) => a.round - b.round || a.index - b.index)
      .find((m) => (m.status === "pending" || m.status === "live") && m.homeId && m.awayId && m.id !== t.activeMatchId) ??
    null
  );
}

export const reopen = (id: string, matchId: string) =>
  mutate(id, (t) => ({
    matches: reopenMatch(t.matches, matchId),
    activeMatchId: matchId,
    championId: null,
    status: "live",
  }));
