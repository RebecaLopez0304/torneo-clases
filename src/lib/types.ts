export type Team = {
  id: string;
  name: string;
  /** Color del escudo (hex) */
  color: string;
  /** Integrantes del equipo; no necesitan cuenta */
  members: string[];
};

export type TimerState = {
  durationMs: number;
  /** Tiempo restante en el momento en que se pausó (o se inició) */
  remainingMs: number;
  /** Hora del servidor (ms) en que se puso en marcha; null si está en pausa */
  runningSince: number | null;
};

export type MatchStatus = "pending" | "live" | "finished" | "bye";

export type Match = {
  id: string;
  round: number;
  index: number;
  homeId: string | null;
  awayId: string | null;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  winnerId: string | null;
  periodLabel: string;
  timer: TimerState;
};

export type TournamentStatus = "draft" | "live" | "finished";

export type Tournament = {
  id: string;
  name: string;
  subtitle: string;
  status: TournamentStatus;
  scoreUnit: string;
  scoreSteps: number[];
  roundDurationSec: number;
  teams: Team[];
  /** Tamaño del cuadro: 2, 4, 8 o 16 */
  bracketSize: number;
  /** Cruces de la primera ronda mientras está en preparación: el partido i es slots[2i] vs slots[2i+1]; null = pase directo */
  slots: (string | null)[];
  /** Fecha (ms) del último sorteo aleatorio; null si los cruces nunca se sortearon */
  drawnAt: number | null;
  matches: Record<string, Match>;
  activeMatchId: string | null;
  championId: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};
