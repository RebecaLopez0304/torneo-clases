import { Hourglass } from "lucide-react";

export function WaitingScreen({ teamCount }: { teamCount: number }) {
  return (
    <section className="panel mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
      <Hourglass className="size-12 text-gold drop-shadow-[0_0_16px_rgb(244_196_48/0.45)]" strokeWidth={1.6} aria-hidden />
      <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">Esperando que inicie el torneo</h2>
      <p className="mt-3 text-ink-muted">
        {teamCount === 0
          ? "Aún se están inscribiendo los equipos."
          : `${teamCount} ${teamCount === 1 ? "equipo inscrito" : "equipos inscritos"}. Los cruces se revelarán al iniciar.`}
      </p>
      <p className="mt-6 text-sm text-ink-faint">Esta página se actualiza sola.</p>
    </section>
  );
}
