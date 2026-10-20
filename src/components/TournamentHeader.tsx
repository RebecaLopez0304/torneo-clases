import { Trophy } from "lucide-react";

/** Título grande del torneo: trofeo, nombre dorado (con el año en blanco si lo tiene) y subtítulo espaciado. */
export function TournamentHeader({ name, subtitle }: { name: string; subtitle: string }) {
  const match = name.match(/^(.*?)\s+(\d{2,4})$/);
  const main = match ? match[1] : name;
  const year = match?.[2];

  return (
    <header className="flex flex-col items-center px-4 pt-2 pb-6 text-center sm:pb-8">
      <div className="flex items-center gap-3 sm:gap-5">
        <Trophy
          className="size-12 shrink-0 text-gold drop-shadow-[0_0_18px_rgb(244_196_48/0.55)] sm:size-16"
          strokeWidth={1.75}
          aria-hidden
        />
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-wide uppercase sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-b from-[#ffe58a] via-gold to-[#c8901a] bg-clip-text text-transparent">{main}</span>
          {year && <span className="ml-3 text-ink sm:ml-4">{year}</span>}
        </h1>
      </div>
      {subtitle && (
        <p className="mt-3 text-sm font-semibold tracking-[0.45em] text-ink uppercase sm:text-lg sm:tracking-[0.6em]">
          {subtitle}
        </p>
      )}
    </header>
  );
}
