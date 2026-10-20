"use client";

import { useState } from "react";
import { Check, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { approveRequest, rejectRequest } from "@/lib/requests";
import type { JoinRequest, Tournament } from "@/lib/types";
import { Avatar } from "./AppBar";
import { ConfirmDialog } from "./Dialog";
import { Shield } from "./Shield";

function when(ms: number) {
  return new Date(ms).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Solicitudes de inscripción: aprobar, rechazar y quitar integrantes con cuenta. */
export function RequestsTab({ tournament: t, requests: list }: { tournament: Tournament; requests: JoinRequest[] | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<JoinRequest | null>(null);
  const draft = t.status === "draft";
  const team = (id: string | null) => t.teams.find((x) => x.id === id);

  async function run(uid: string, action: () => Promise<void>, ok: string) {
    setBusy(uid);
    try {
      await action();
      toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "No se pudo completar.");
    } finally {
      setBusy(null);
    }
  }

  if (list === null) return <p className="text-ink-muted">Cargando solicitudes…</p>;

  const pending = list.filter((r) => r.status === "pending");
  const approved = list.filter((r) => r.status === "approved");
  const rejected = list.filter((r) => r.status === "rejected");

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">
        {draft
          ? "Las personas se inscriben con su cuenta. Nadie entra a un equipo sin tu aprobación."
          : "El torneo ya empezó: las inscripciones están cerradas."}
      </p>

      <section>
        <h2 className="font-display text-xl font-bold">Pendientes ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No hay solicitudes por revisar.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((r) => {
              const target = r.type === "create" ? r.newTeam : team(r.teamId);
              return (
                <li key={r.uid} className="chip flex flex-wrap items-center gap-3 p-3">
                  <Avatar name={r.name} photo={r.photoURL} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">{r.name}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
                      {r.type === "create" ? "Propone el equipo nuevo" : "Quiere unirse a"}
                      <Shield color={target?.color} size={16} />
                      <span className="font-semibold text-ink">{target?.name ?? "un equipo que ya no existe"}</span>
                    </p>
                    <p className="text-xs text-ink-faint">{when(r.updatedAt)}</p>
                  </div>
                  {draft && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-gold px-3 text-sm"
                        disabled={busy === r.uid}
                        onClick={() => run(r.uid, () => approveRequest(t.id, r.uid), `${r.name} ya forma parte del equipo.`)}
                      >
                        <Check className="size-4" aria-hidden /> Aprobar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-3 text-sm"
                        disabled={busy === r.uid}
                        onClick={() => run(r.uid, () => rejectRequest(t.id, r.uid), "Solicitud rechazada.")}
                      >
                        <X className="size-4" aria-hidden /> Rechazar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Integrantes con cuenta ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Todavía nadie se ha inscrito con su cuenta.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {approved.map((r) => {
              const tm = team(r.teamId);
              return (
                <li key={r.uid} className="chip flex flex-wrap items-center gap-3 p-3">
                  <Avatar name={r.name} photo={r.photoURL} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">{r.name}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
                      <Shield color={tm?.color} size={16} />
                      {tm ? tm.name : "Su equipo fue eliminado"}
                      {r.decidedBy && <span className="text-ink-faint">(aprobó {r.decidedBy.name})</span>}
                    </p>
                  </div>
                  {draft && (
                    <button
                      type="button"
                      className="btn btn-ghost px-3 text-sm"
                      disabled={busy === r.uid}
                      onClick={() => setRemoving(r)}
                    >
                      <UserMinus className="size-4" aria-hidden /> Quitar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {rejected.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Rechazadas ({rejected.length})</h2>
          <ul className="mt-3 space-y-1 text-sm text-ink-muted">
            {rejected.map((r) => (
              <li key={r.uid}>
                <span className="text-ink">{r.name}</span>{" "}
                {r.type === "create" ? `propuso ${r.newTeam?.name}` : `pidió ${team(r.teamId)?.name ?? "un equipo"}`}
                {r.decidedBy && ` (rechazó ${r.decidedBy.name}, ${when(r.decidedAt ?? r.updatedAt)})`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Quitar del equipo"
        message={`${removing?.name} dejará de ser integrante de ${team(removing?.teamId ?? null)?.name ?? "su equipo"}. Podrá volver a solicitar inscripción.`}
        confirmLabel="Quitar"
        danger
        busy={busy !== null}
        onConfirm={async () => {
          if (!removing) return;
          await run(removing.uid, () => rejectRequest(t.id, removing.uid), `${removing.name} salió del equipo.`);
          setRemoving(null);
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
