import { Hourglass, Users } from "lucide-react";
import type { Actor, Team } from "@/lib/types";
import { Shield } from "./Shield";

/** Lo que ve quien no administra mientras el torneo está en preparación: equipos inscritos, sin cruces. */
export function WaitingScreen({ teams, members }: { teams: Team[]; members: Map<string, Actor[]> }) {
  return (
    <section className="panel px-5 py-10 text-center sm:px-8">
      <Hourglass className="mx-auto size-12 text-gold drop-shadow-[0_0_16px_rgb(244_196_48/0.45)]" strokeWidth={1.6} aria-hidden />
      <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">Esperando que inicie el torneo</h2>
      <p className="mt-3 text-ink-muted">
        {teams.length === 0
          ? "Aún no hay equipos inscritos."
          : `${teams.length} ${teams.length === 1 ? "equipo inscrito" : "equipos inscritos"}. Los cruces se revelarán al iniciar.`}
      </p>

      {teams.length > 0 && (
        <ul className="mx-auto mt-6 grid max-w-2xl gap-2 text-left sm:grid-cols-2">
          {teams.map((t) => {
            const names = [...t.members, ...(members.get(t.id) ?? []).map((m) => m.name)];
            return (
              <li key={t.id} className="chip flex items-start gap-3 px-3 py-2.5">
                <Shield color={t.color} size={24} glow className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words">{t.name}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-muted">
                    <Users className="size-3.5 shrink-0" aria-hidden />
                    {names.length ? names.join(", ") : "Sin integrantes todavía"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-sm text-ink-faint">Esta página se actualiza sola.</p>
    </section>
  );
}
