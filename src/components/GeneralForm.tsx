"use client";

import { useState } from "react";
import clsx from "clsx";
import type { GeneralSettings } from "@/lib/tournaments";

const STEP_OPTIONS = [1, 2, 3, 5, 10];
const UNIT_SUGGESTIONS = ["puntos", "aciertos", "respuestas correctas", "retos", "goles"];

export const DEFAULT_SETTINGS: GeneralSettings = {
  name: "",
  subtitle: "",
  scoreUnit: "puntos",
  scoreSteps: [1],
  roundDurationSec: 300,
};

export function GeneralForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: GeneralSettings;
  submitLabel: string;
  onSubmit: (s: GeneralSettings) => Promise<void>;
}) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minutes = Math.floor(s.roundDurationSec / 60);
  const seconds = s.roundDurationSec % 60;

  function setDuration(m: number, sec: number) {
    const total = Math.max(0, Math.min(99, m || 0)) * 60 + Math.max(0, Math.min(59, sec || 0));
    setS({ ...s, roundDurationSec: total });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!s.name.trim()) return setError("Ponle un nombre al torneo.");
    if (!s.scoreUnit.trim()) return setError("Escribe cómo se llaman los puntos (por ejemplo, puntos o aciertos).");
    if (s.roundDurationSec < 10) return setError("La duración de cada ronda debe ser de al menos 10 segundos.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...s, name: s.name.trim(), subtitle: s.subtitle.trim(), scoreUnit: s.scoreUnit.trim().toLowerCase() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Nombre del torneo</span>
          <input
            className="field"
            value={s.name}
            onChange={(e) => setS({ ...s, name: e.target.value })}
            placeholder="Aknaton Cup 2026"
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Subtítulo (opcional)</span>
          <input
            className="field"
            value={s.subtitle}
            onChange={(e) => setS({ ...s, subtitle: e.target.value })}
            placeholder="Ingeniería de Software, 5.º semestre"
            maxLength={50}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">¿Qué se cuenta en el marcador?</span>
          <input
            className="field"
            list="unit-suggestions"
            value={s.scoreUnit}
            onChange={(e) => setS({ ...s, scoreUnit: e.target.value })}
            maxLength={20}
          />
          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>

        <fieldset>
          <legend className="mb-1 text-sm text-ink-muted">Duración de cada ronda</legend>
          <div className="flex items-center gap-2">
            <input
              className="field w-20 text-center"
              type="number"
              min={0}
              max={99}
              value={minutes}
              aria-label="Minutos"
              onChange={(e) => setDuration(Number(e.target.value), seconds)}
            />
            <span className="text-ink-muted">min</span>
            <input
              className="field w-20 text-center"
              type="number"
              min={0}
              max={59}
              value={seconds}
              aria-label="Segundos"
              onChange={(e) => setDuration(minutes, Number(e.target.value))}
            />
            <span className="text-ink-muted">s</span>
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm text-ink-muted">Botones para sumar y restar</legend>
        <div className="flex flex-wrap gap-2">
          {STEP_OPTIONS.map((n) => {
            const on = s.scoreSteps.includes(n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? s.scoreSteps.filter((x) => x !== n) : [...s.scoreSteps, n].sort((a, b) => a - b);
                  if (next.length) setS({ ...s, scoreSteps: next });
                }}
                className={clsx(
                  "min-w-14 rounded-lg border px-3 py-2 font-display text-lg font-bold",
                  on ? "border-gold bg-gold/15 text-gold" : "border-line bg-navy-900 text-ink-muted hover:text-ink",
                )}
              >
                ±{n}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-ink-faint">Elige uno o varios. Se muestran como botones en el marcador.</p>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg border border-minus-edge bg-minus/60 px-3 py-2 text-sm text-[#ffd6e4]">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-gold">
        {submitLabel}
      </button>
    </form>
  );
}
