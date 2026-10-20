import { describe, expect, it } from "vitest";
import {
  bracketSizeFor,
  buildMatches,
  canReopen,
  championPath,
  drawSlots,
  finalizeMatch,
  formatClock,
  matchId,
  orderedSlots,
  pauseTimer,
  placeInSlot,
  remainingMs,
  reopenMatch,
  resetTimer,
  roundName,
  startTimer,
  syncSlots,
  validateSlots,
} from "./bracket";
import type { Match } from "./types";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

function play(matches: Record<string, Match>, id: string, home: number, away: number, tie?: string) {
  const m = { ...matches, [id]: { ...matches[id], homeScore: home, awayScore: away, status: "live" as const } };
  return finalizeMatch(m, id, tie);
}

describe("tamaño del cuadro", () => {
  it("usa la siguiente potencia de 2", () => {
    expect([2, 3, 4, 5, 8, 9, 16].map(bracketSizeFor)).toEqual([2, 4, 4, 8, 8, 16, 16]);
  });

  it("nombra las rondas desde la final", () => {
    expect([0, 1, 2, 3].map((r) => roundName(r, 4))).toEqual([
      "Octavos de final",
      "Cuartos de final",
      "Semifinales",
      "Gran final",
    ]);
    expect(roundName(0, 1)).toBe("Gran final");
  });
});

describe("sorteo", () => {
  for (let n = 2; n <= 16; n++) {
    it(`con ${n} equipos coloca a todos una vez y sin dobles pases directos`, () => {
      for (let k = 0; k < 50; k++) {
        const teams = ids(n);
        const slots = drawSlots(teams);
        expect(slots).toHaveLength(bracketSizeFor(n));
        expect(validateSlots(slots, teams)).toEqual([]);
        expect(slots.filter(Boolean).sort()).toEqual([...teams].sort());
      }
    });
  }

  it("reparte posiciones de forma razonablemente uniforme", () => {
    const counts = new Map<number, number>();
    const runs = 8000;
    for (let k = 0; k < runs; k++) {
      const slot = drawSlots(ids(8)).indexOf("t1");
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
    expect(counts.size).toBe(8);
    for (const c of counts.values()) expect(Math.abs(c - runs / 8)).toBeLessThan(runs / 8 * 0.2);
  });

  it("el acomodo en orden también es válido", () => {
    for (let n = 2; n <= 16; n++) expect(validateSlots(orderedSlots(ids(n)), ids(n))).toEqual([]);
  });
});

describe("ajuste manual", () => {
  it("intercambia equipos si el elegido ya estaba en otro hueco", () => {
    const slots = ["t1", "t2", "t3", "t4"];
    expect(placeInSlot(slots, 0, "t4")).toEqual(["t4", "t2", "t3", "t1"]);
  });

  it("un pase directo deja al equipo sin colocar y se detecta", () => {
    const slots = placeInSlot(["t1", "t2", "t3", null], 1, null);
    expect(validateSlots(slots, ids(3))).toEqual([{ kind: "unplaced", teamId: "t2" }]);
  });

  it("detecta partidos sin ningún equipo", () => {
    expect(validateSlots(["t1", "t2", null, null], ["t1", "t2", "t3"])).toContainEqual({ kind: "double-bye", match: 1 });
  });

  it("al agregar o quitar equipos los cruces siguen siendo válidos", () => {
    let teams = ids(6);
    let slots = drawSlots(teams);
    teams = [...teams, "t7"];
    slots = syncSlots(slots, teams);
    expect(validateSlots(slots, teams)).toEqual([]);
    for (const drop of ["t1", "t3", "t5"]) {
      teams = teams.filter((t) => t !== drop);
      slots = syncSlots(slots, teams);
      expect(validateSlots(slots, teams)).toEqual([]);
    }
    expect(slots).toHaveLength(4);
  });
});

describe("partidos", () => {
  it("adelanta a los equipos con pase directo", () => {
    const matches = buildMatches(["t1", null, "t2", "t3", null, "t4", "t5", "t6"], 300);
    expect(Object.keys(matches)).toHaveLength(7);
    expect(matches.r0m0).toMatchObject({ status: "bye", winnerId: "t1" });
    expect(matches.r0m2).toMatchObject({ status: "bye", winnerId: "t4" });
    expect(matches.r1m0.homeId).toBe("t1");
    expect(matches.r1m1.homeId).toBe("t4");
  });

  it("avanza al ganador hasta el campeón", () => {
    let matches = buildMatches(["t1", "t2", "t3", "t4"], 300);
    let res = play(matches, "r0m0", 3, 1);
    expect(res.matches.r1m0.homeId).toBe("t1");
    res = play(res.matches, "r0m1", 0, 2);
    expect(res.matches.r1m0.awayId).toBe("t4");
    res = play(res.matches, "r1m0", 1, 1, "t4");
    expect(res.championId).toBe("t4");
    matches = res.matches;
    expect([...championPath(matches, "t4")].sort()).toEqual(["r0m1", "r1m0"]);
  });

  it("en empate exige elegir ganador", () => {
    const matches = buildMatches(["t1", "t2"], 300);
    expect(() => play(matches, "r0m0", 2, 2)).toThrow(/Empate/);
    expect(() => play(matches, "r0m0", 2, 2, "t9")).toThrow(/Empate/);
    expect(play(matches, "r0m0", 2, 2, "t2").championId).toBe("t2");
  });

  it("no finaliza partidos incompletos", () => {
    const matches = buildMatches(["t1", "t2", "t3", "t4"], 300);
    expect(() => finalizeMatch(matches, matchId(1, 0))).toThrow(/Faltan equipos/);
  });

  it("reabre solo si el siguiente partido no empezó", () => {
    let { matches } = play(buildMatches(["t1", "t2", "t3", "t4"], 300), "r0m0", 1, 0);
    expect(canReopen(matches, "r0m0")).toBe(true);
    const reopened = reopenMatch(matches, "r0m0");
    expect(reopened.r0m0).toMatchObject({ status: "live", winnerId: null });
    expect(reopened.r1m0.homeId).toBeNull();

    matches = play(matches, "r0m1", 1, 0).matches;
    matches = { ...matches, r1m0: { ...matches.r1m0, status: "live", homeScore: 1 } };
    expect(canReopen(matches, "r0m0")).toBe(false);
    expect(() => reopenMatch(matches, "r0m0")).toThrow();
  });
});

describe("reloj", () => {
  it("cuenta, pausa y reinicia", () => {
    let t = resetTimer({ durationMs: 60_000, remainingMs: 0, runningSince: null });
    t = startTimer(t, 1_000);
    expect(remainingMs(t, 11_000)).toBe(50_000);
    t = pauseTimer(t, 11_000);
    expect(t).toEqual({ durationMs: 60_000, remainingMs: 50_000, runningSince: null });
    expect(remainingMs(t, 99_000)).toBe(50_000);
    t = startTimer(t, 100_000);
    expect(remainingMs(t, 1_000_000)).toBe(0);
    expect(resetTimer(t).remainingMs).toBe(60_000);
  });

  it("formatea mm:ss redondeando hacia arriba", () => {
    expect(formatClock(300_000)).toBe("05:00");
    expect(formatClock(59_001)).toBe("01:00");
    expect(formatClock(0)).toBe("00:00");
  });
});
