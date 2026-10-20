"use client";

import { useState } from "react";
import { AlertTriangle, Play, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { validateSlots } from "@/lib/bracket";
import { drawBracket, startTournament } from "@/lib/tournaments";
import type { Tournament } from "@/lib/types";
import { ConfirmDialog } from "./Dialog";

/** Problemas de los cruces en texto, o lista vacía si se puede iniciar. */
export function draftProblems(t: Tournament): string[] {
  if (t.teams.length < 2) return ["Inscribe al menos 2 equipos."];
  const name = (id: string) => t.teams.find((x) => x.id === id)?.name ?? "Un equipo";
  return validateSlots(
    t.slots,
    t.teams.map((x) => x.id),
  ).map((p) =>
    p.kind === "unplaced"
      ? `${name(p.teamId)} no tiene cruce asignado.`
      : p.kind === "double-bye"
        ? `El partido ${p.match + 1} no tiene equipos.`
        : "Los cruces no coinciden con los equipos inscritos; vuelve a sortear.",
  );
}

/** Botones "Sortear al azar" e "Iniciar torneo" con su estado. */
export function DraftControls({ tournament, compact }: { tournament: Tournament; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const problems = draftProblems(tournament);
  const canDraw = tournament.teams.length >= 2;

  async function draw() {
    setBusy(true);
    try {
      await drawBracket(tournament.id);
      toast.success("Cruces sorteados al azar.");
    } catch {
      toast.error("No se pudo sortear. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      await startTournament(tournament.id);
      toast.success("¡Torneo iniciado!");
      setConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar el torneo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {problems.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-gold/40 bg-gold-deep/25 px-3 py-2 text-sm text-gold-soft">
          {problems.map((p) => (
            <li key={p} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {p}
            </li>
          ))}
        </ul>
      )}
      {!compact && problems.length === 0 && (
        <p className="text-sm text-ink-muted">
          {tournament.drawnAt
            ? `Último sorteo: ${new Date(tournament.drawnAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}. Puedes volver a sortear o ajustar a mano.`
            : "Los cruces están en orden de inscripción. Sortéalos al azar o ajústalos a mano."}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-ghost" onClick={draw} disabled={busy || !canDraw}>
          <Shuffle className="size-4" aria-hidden /> {tournament.drawnAt ? "Volver a sortear" : "Sortear al azar"}
        </button>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => setConfirm(true)}
          disabled={busy || problems.length > 0}
        >
          <Play className="size-4" aria-hidden /> Iniciar torneo
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Iniciar torneo"
        message="Los cruces quedarán fijos y todos verán el cuadro de eliminatorias. Ya no podrás agregar ni quitar equipos."
        confirmLabel="Iniciar torneo"
        busy={busy}
        onConfirm={start}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
