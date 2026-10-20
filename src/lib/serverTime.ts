"use client";

import { useEffect, useState } from "react";

// Diferencia (ms) entre el reloj del servidor y el de este dispositivo.
// Así el reloj del partido coincide en todas las pantallas aunque alguna tenga la hora mal.
let offset = 0;
let syncing: Promise<void> | null = null;

async function measure() {
  const samples: { offset: number; rtt: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const res = await fetch("/api/time", { cache: "no-store" });
    const { now } = (await res.json()) as { now: number };
    const t1 = Date.now();
    samples.push({ offset: now + (t1 - t0) / 2 - t1, rtt: t1 - t0 });
  }
  offset = samples.sort((a, b) => a.rtt - b.rtt)[0].offset;
}

export function syncServerTime(): Promise<void> {
  syncing ??= measure().catch(() => {
    syncing = null;
  });
  return syncing;
}

export function serverNow(): number {
  return Date.now() + offset;
}

/** Hora del servidor que se actualiza mientras `active` sea true. */
export function useServerNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    void syncServerTime().then(() => setNow(serverNow()));
  }, []);
  useEffect(() => {
    if (!active) return;
    setNow(serverNow());
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
