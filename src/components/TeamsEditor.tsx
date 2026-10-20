"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { MAX_TEAMS, MIN_TEAMS } from "@/lib/bracket";
import { TEAM_COLORS, nextFreeColor } from "@/lib/colors";
import { currentActor } from "@/lib/actor";
import { checkTexts } from "@/lib/profanity";
import { useApprovedMembers } from "@/lib/requests";
import { saveTeams } from "@/lib/tournaments";
import type { Team, Tournament } from "@/lib/types";
import { Shield } from "./Shield";

const newId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 10);

export function TeamsEditor({ tournament }: { tournament: Tournament }) {
  const locked = tournament.status !== "draft";
  const [teams, setTeams] = useState<Team[]>(tournament.teams);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accounts = useApprovedMembers(tournament.id);
  const dirty = JSON.stringify(teams) !== JSON.stringify(tournament.teams);

  // Si otra persona cambia los equipos y aquí no hay cambios sin guardar, refrescar.
  const lastSaved = useRef(tournament.teams);
  useEffect(() => {
    const prev = JSON.stringify(lastSaved.current);
    setTeams((cur) => (JSON.stringify(cur) === prev ? tournament.teams : cur));
    lastSaved.current = tournament.teams;
  }, [tournament.teams]);

  function update(id: string, patch: Partial<Team>) {
    setTeams((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function add() {
    const id = newId();
    setTeams((list) => [
      ...list,
      {
        id,
        name: `Equipo ${list.length + 1}`,
        color: nextFreeColor(list.map((t) => t.color)),
        members: [],
        createdBy: currentActor(),
      },
    ]);
    setOpen(id);
  }

  async function save() {
    const clean = teams.map((t) => ({
      ...t,
      name: t.name.trim(),
      members: t.members.map((m) => m.trim()).filter(Boolean),
    }));
    if (clean.some((t) => !t.name)) return toast.error("Todos los equipos necesitan un nombre.");
    const names = clean.map((t) => t.name.toLowerCase());
    if (new Set(names).size !== names.length) return toast.error("Hay dos equipos con el mismo nombre.");
    const bad = checkTexts({
      "Nombre del equipo": clean.map((t) => t.name),
      Integrantes: clean.flatMap((t) => t.members),
    });
    if (bad) return toast.error(bad);
    setBusy(true);
    try {
      await saveTeams(tournament.id, clean);
      setTeams(clean);
      toast.success("Equipos guardados.");
    } catch {
      toast.error("No se pudieron guardar los equipos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {locked
            ? "El torneo ya empezó: puedes cambiar nombres, colores e integrantes, pero no agregar ni quitar equipos."
            : `Inscribe de ${MIN_TEAMS} a ${MAX_TEAMS} equipos. Los integrantes no necesitan cuenta.`}
        </p>
        <span className="font-display text-lg font-bold text-ink-muted">
          {teams.length}/{MAX_TEAMS}
        </span>
      </div>

      {teams.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-ink-muted">
          Aún no hay equipos. Agrega el primero.
        </p>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => {
            const expanded = open === t.id;
            return (
              <li key={t.id} className="chip">
                <div className="flex items-center gap-2 p-2">
                  <ColorPicker color={t.color} onChange={(color) => update(t.id, { color })} label={t.name} />
                  <input
                    className="field min-w-0 flex-1"
                    value={t.name}
                    maxLength={24}
                    aria-label="Nombre del equipo"
                    onChange={(e) => update(t.id, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : t.id)}
                    aria-expanded={expanded}
                    className="btn btn-ghost shrink-0 px-3 text-sm"
                  >
                    <span className="hidden sm:inline">Integrantes</span>
                    <span className="rounded bg-navy-700 px-1.5 text-xs">{t.members.filter((m) => m.trim()).length + (accounts.get(t.id)?.length ?? 0)}</span>
                    <ChevronDown className={clsx("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
                  </button>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => setTeams((list) => list.filter((x) => x.id !== t.id))}
                      aria-label={`Quitar ${t.name}`}
                      className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-minus hover:text-[#ffd6e4]"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                {expanded && (
                  <div className="space-y-2 px-2 pb-2">
                    {(accounts.get(t.id)?.length ?? 0) > 0 && (
                      <p className="text-xs text-ink-muted">
                        Con cuenta: <span className="text-ink">{accounts.get(t.id)!.map((a) => a.name).join(", ")}</span>
                        <span className="text-ink-faint"> (se gestionan en Solicitudes)</span>
                      </p>
                    )}
                    <label className="block">
                      <span className="mb-1 block text-xs text-ink-muted">
                        Sin cuenta: un integrante por línea (nombre o matrícula)
                      </span>
                      <textarea
                        className="field min-h-28 resize-y"
                        value={t.members.join("\n")}
                        onChange={(e) => update(t.id, { members: e.target.value.split("\n") })}
                        placeholder={"María Fernández\nCarlos Rivera"}
                      />
                    </label>
                    {t.createdBy && <p className="text-xs text-ink-faint">Creado por {t.createdBy.name}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!locked && (
          <button type="button" onClick={add} disabled={teams.length >= MAX_TEAMS} className="btn btn-ghost">
            <Plus className="size-4" aria-hidden /> Agregar equipo
          </button>
        )}
        <button type="button" onClick={save} disabled={!dirty || busy} className="btn btn-gold">
          Guardar equipos
        </button>
        {dirty && <span className="self-center text-sm text-gold">Hay cambios sin guardar</span>}
      </div>
    </div>
  );
}

function ColorPicker({ color, label, onChange }: { color: string; label: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Color de ${label}`}
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-lg hover:bg-navy-700"
      >
        <Shield color={color} size={24} glow />
      </button>
      {open && (
        <div className="absolute top-12 left-0 z-20 grid w-52 grid-cols-4 gap-1 rounded-xl border border-line bg-navy-900 p-2 shadow-2xl">
          {TEAM_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={c.hex === color}
              onClick={() => {
                onChange(c.hex);
                setOpen(false);
              }}
              className={clsx(
                "grid h-11 place-items-center rounded-lg hover:bg-navy-700",
                c.hex === color && "bg-navy-700 ring-1 ring-gold",
              )}
            >
              <Shield color={c.hex} size={22} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
