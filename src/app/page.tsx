"use client";

import Link from "next/link";
import { Crown, Plus, Trophy, Users } from "lucide-react";
import { AppBar } from "@/components/AppBar";
import { FirebaseMissing } from "@/components/FirebaseMissing";
import { NoEditNotice } from "@/components/NoEditNotice";
import { Shield } from "@/components/Shield";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { useTournaments } from "@/lib/tournaments";

export default function Home() {
  return (
    <>
      <AppBar />
      <NoEditNotice />
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {firebaseConfigured ? <TournamentList /> : <FirebaseMissing />}
      </main>
    </>
  );
}

function TournamentList() {
  const { isAdmin } = useAuth();
  const { list, error } = useTournaments();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <Trophy className="size-10 text-gold drop-shadow-[0_0_14px_rgb(244_196_48/0.45)]" aria-hidden />
          <h1 className="font-display text-4xl font-extrabold tracking-wide text-gold uppercase sm:text-5xl">Torneos</h1>
        </div>
        {isAdmin && (
          <Link href="/nuevo" className="btn btn-gold">
            <Plus className="size-4" aria-hidden /> Nuevo torneo
          </Link>
        )}
      </div>

      {error ? (
        <p className="panel p-6 text-ink-muted">
          No se pudieron cargar los torneos. Revisa que las reglas de Firestore estén publicadas.
        </p>
      ) : list === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="panel h-32 animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-14 text-center">
          <Shield size={48} color="#2e4f8f" />
          <p className="mt-4 text-lg font-semibold">Todavía no hay torneos</p>
          <p className="mt-1 text-ink-muted">
            {isAdmin ? "Crea el primero e inscribe a los equipos de tu materia." : "Vuelve pronto: aquí aparecerán los torneos."}
          </p>
          {isAdmin && (
            <Link href="/nuevo" className="btn btn-gold mt-5">
              <Plus className="size-4" aria-hidden /> Crear torneo
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((t) => {
            const champion = t.teams.find((x) => x.id === t.championId);
            return (
              <li key={t.id}>
                <Link href={`/t/${t.id}`} className="panel group block p-5 transition-colors hover:border-ink-muted">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-2xl font-bold group-hover:text-gold">{t.name}</h2>
                      {t.subtitle && <p className="truncate text-sm text-ink-muted">{t.subtitle}</p>}
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" aria-hidden />
                      {t.teams.length} {t.teams.length === 1 ? "equipo" : "equipos"}
                    </span>
                    {champion ? (
                      <span className="flex items-center gap-1.5 font-semibold text-gold">
                        <Crown className="size-4" aria-hidden /> {champion.name}
                      </span>
                    ) : (
                      <span className="flex -space-x-1.5">
                        {t.teams.slice(0, 8).map((x) => (
                          <Shield key={x.id} color={x.color} size={18} />
                        ))}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
