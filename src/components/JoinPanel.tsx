"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { toast } from "sonner";
import { Clock3, LogIn, UserPlus, Users, XCircle } from "lucide-react";
import { MAX_TEAMS } from "@/lib/bracket";
import { TEAM_COLORS } from "@/lib/colors";
import { useAuth } from "@/lib/auth";
import { checkTexts } from "@/lib/profanity";
import { submitRequest, useMyRequest, withdrawRequest, type RequestInput } from "@/lib/requests";
import type { Actor, JoinRequest, Tournament } from "@/lib/types";
import { ConfirmDialog } from "./Dialog";
import { Shield } from "./Shield";

/** Inscripción de la cuenta actual: unirse a un equipo o proponer uno nuevo, con aprobación de un admin. */
export function JoinPanel({ tournament: t, members }: { tournament: Tournament; members: Map<string, Actor[]> }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const { request, loading: loadingRequest } = useMyRequest(t.id, user?.uid ?? null);
  const [editing, setEditing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const draft = t.status === "draft";

  if (loading || (user && loadingRequest)) return <div className="panel h-40 animate-pulse" />;

  if (!user) {
    if (!draft) return null;
    return (
      <section className="panel p-5 text-center sm:p-6">
        <UserPlus className="mx-auto size-8 text-gold" aria-hidden />
        <h2 className="mt-2 font-display text-2xl font-bold">¿Quieres participar?</h2>
        <p className="mt-1 text-ink-muted">Para inscribirte en un equipo necesitas una cuenta, así sabemos quién es quién.</p>
        <Link href={`/entrar?volver=${encodeURIComponent(pathname)}`} className="btn btn-gold mt-4">
          <LogIn className="size-4" aria-hidden /> Iniciar sesión para inscribirme
        </Link>
      </section>
    );
  }

  const teamName = (id: string | null) => t.teams.find((x) => x.id === id)?.name ?? null;
  const target = request ? (request.type === "create" ? request.newTeam?.name : teamName(request.teamId)) : null;
  const teamGone = request?.status === "approved" && !teamName(request.teamId);

  async function leave() {
    setBusy(true);
    try {
      await withdrawRequest(t.id);
      toast.success(request?.status === "approved" ? "Saliste del equipo." : "Solicitud cancelada.");
      setConfirmLeave(false);
      setEditing(false);
    } catch {
      toast.error("No se pudo completar. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    if (request?.status !== "approved" || teamGone) return null;
    return (
      <section className="panel flex items-center gap-3 p-4">
        <Shield color={t.teams.find((x) => x.id === request.teamId)?.color} size={28} glow />
        <p>
          Participas con <strong className="text-gold">{target}</strong>.
        </p>
      </section>
    );
  }

  const showForm = editing || !request || request.status === "rejected" || teamGone;

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <UserPlus className="size-6 text-gold" aria-hidden /> Inscripción
      </h2>

      {request && !editing && (
        <StatusCard request={request} target={target} teamGone={teamGone} color={t.teams.find((x) => x.id === request.teamId)?.color ?? request.newTeam?.color} />
      )}

      {request && !editing && !teamGone && request.status !== "rejected" && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            {request.status === "approved" ? "Cambiar de equipo" : "Cambiar solicitud"}
          </button>
          <button type="button" className="btn btn-ghost text-[#ffb3c9]" onClick={() => setConfirmLeave(true)}>
            {request.status === "approved" ? "Salir del equipo" : "Cancelar solicitud"}
          </button>
        </div>
      )}

      {showForm && (
        <RequestForm
          tournament={t}
          members={members}
          request={request}
          busy={busy}
          onCancel={request && !teamGone && request.status !== "rejected" ? () => setEditing(false) : undefined}
          onSubmit={async (input) => {
            setBusy(true);
            try {
              await submitRequest(t.id, input, user.photoURL ?? "");
              toast.success("Solicitud enviada. Un admin la revisará.");
              setEditing(false);
            } catch (err) {
              toast.error(err instanceof Error && err.message ? err.message : "No se pudo enviar la solicitud.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      <ConfirmDialog
        open={confirmLeave}
        title={request?.status === "approved" ? "Salir del equipo" : "Cancelar solicitud"}
        message={
          request?.status === "approved"
            ? `Dejarás de ser integrante de ${target}. Podrás inscribirte de nuevo mientras el torneo no empiece.`
            : "Se borrará tu solicitud pendiente."
        }
        confirmLabel={request?.status === "approved" ? "Salir del equipo" : "Cancelar solicitud"}
        danger
        busy={busy}
        onConfirm={leave}
        onClose={() => setConfirmLeave(false)}
      />
    </section>
  );
}

function StatusCard({
  request,
  target,
  teamGone,
  color,
}: {
  request: JoinRequest;
  target: string | null | undefined;
  teamGone: boolean;
  color?: string;
}) {
  if (teamGone) {
    return (
      <p className="mt-3 rounded-lg border border-gold/40 bg-gold-deep/25 px-3 py-2 text-sm text-gold-soft">
        El equipo en el que estabas ya no existe. Elige otro para seguir inscrito.
      </p>
    );
  }
  if (request.status === "rejected") {
    return (
      <p className="mt-3 flex gap-2 rounded-lg border border-minus-edge bg-minus/50 px-3 py-2 text-sm text-[#ffd6e4]">
        <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        Tu solicitud para {request.type === "create" ? "crear" : "unirte a"} {target ?? "un equipo"} no fue aceptada
        {request.decidedBy ? ` (${request.decidedBy.name})` : ""}. Puedes enviar otra.
      </p>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-navy-950/40 p-3">
      <Shield color={color} size={32} glow />
      <div className="min-w-0">
        {request.status === "approved" ? (
          <p className="font-semibold">
            Ya formas parte de <span className="text-gold">{target}</span>
          </p>
        ) : (
          <>
            <p className="font-semibold">
              {request.type === "create" ? "Propusiste el equipo" : "Pediste unirte a"}{" "}
              <span className="text-gold">{target}</span>
            </p>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <Clock3 className="size-4" aria-hidden /> Esperando aprobación de un admin
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RequestForm({
  tournament: t,
  members,
  request,
  busy,
  onSubmit,
  onCancel,
}: {
  tournament: Tournament;
  members: Map<string, Actor[]>;
  request: JoinRequest | null;
  busy: boolean;
  onSubmit: (input: RequestInput) => void;
  onCancel?: () => void;
}) {
  const full = t.teams.length >= MAX_TEAMS;
  const [mode, setMode] = useState<"join" | "create">(t.teams.length === 0 ? "create" : "join");
  const [teamId, setTeamId] = useState<string | null>(request?.type === "join" ? request.teamId : null);
  const used = t.teams.map((x) => x.color);
  const [name, setName] = useState(request?.newTeam?.name ?? "");
  const [color, setColor] = useState(
    request?.newTeam?.color ?? TEAM_COLORS.find((c) => !used.includes(c.hex))?.hex ?? TEAM_COLORS[0].hex,
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "join") {
      if (!teamId) return setError("Elige el equipo al que quieres unirte.");
      return onSubmit({ type: "join", teamId });
    }
    const clean = name.trim();
    if (!clean) return setError("Escribe el nombre del equipo.");
    if (t.teams.some((x) => x.name.toLowerCase() === clean.toLowerCase())) {
      return setError("Ya existe un equipo con ese nombre. Únete a él o elige otro nombre.");
    }
    const bad = checkTexts({ "Nombre del equipo": clean });
    if (bad) return setError(bad);
    onSubmit({ type: "create", name: clean, color });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
      <div role="tablist" className="grid grid-cols-2 rounded-lg border border-line bg-navy-950/60 p-1">
        {(
          [
            ["join", "Unirme a un equipo"],
            ["create", "Proponer equipo"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            disabled={(m === "join" && t.teams.length === 0) || (m === "create" && full)}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={clsx(
              "rounded-md py-2 text-sm font-semibold disabled:opacity-40",
              mode === m ? "bg-navy-700 text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "join" ? (
        <fieldset>
          <legend className="sr-only">Equipo</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {t.teams.map((x) => {
              const accounts = members.get(x.id) ?? [];
              const count = x.members.length + accounts.length;
              return (
                <li key={x.id}>
                  <label
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5",
                      teamId === x.id ? "border-gold bg-gold/10" : "border-line bg-navy-900 hover:border-ink-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="team"
                      className="sr-only"
                      checked={teamId === x.id}
                      onChange={() => setTeamId(x.id)}
                    />
                    <Shield color={x.color} size={24} glow />
                    <span className="min-w-0 flex-1 font-semibold break-words">{x.name}</span>
                    <span className="flex items-center gap-1 text-xs text-ink-muted">
                      <Users className="size-3.5" aria-hidden /> {count}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-ink-muted">Nombre del equipo</span>
            <input className="field" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
          </label>
          <fieldset>
            <legend className="mb-1 text-sm text-ink-muted">Color del escudo</legend>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={color === c.hex}
                  onClick={() => setColor(c.hex)}
                  className={clsx(
                    "grid size-10 place-items-center rounded-lg hover:bg-navy-700",
                    color === c.hex && "bg-navy-700 ring-1 ring-gold",
                  )}
                >
                  <Shield color={c.hex} size={20} />
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-ink-faint">Un admin revisará el nombre antes de que aparezca en el torneo.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-minus-edge bg-minus/60 px-3 py-2 text-sm text-[#ffd6e4]">
          {error}
        </p>
      )}

      {request?.status === "approved" && (
        <p className="text-sm text-gold-soft">Al enviar, saldrás de tu equipo actual hasta que aprueben el cambio.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="btn btn-gold">
          Enviar solicitud
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Volver
          </button>
        )}
      </div>
    </form>
  );
}
