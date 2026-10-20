"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { FirebaseMissing } from "@/components/FirebaseMissing";
import { NoEditNotice } from "@/components/NoEditNotice";
import { TournamentView } from "@/components/TournamentView";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { useTournament } from "@/lib/tournaments";

export default function TournamentPage() {
  return (
    <>
      <AppBar />
      <NoEditNotice />
      {firebaseConfigured ? (
        <Live />
      ) : (
        <main className="px-4">
          <FirebaseMissing />
        </main>
      )}
    </>
  );
}

function Live() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { tournament, loading, error } = useTournament(id);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1500px] px-4">
        <div className="mx-auto mb-8 h-16 max-w-xl animate-pulse rounded-xl bg-navy-800" />
        <div className="panel h-[520px] animate-pulse" />
      </main>
    );
  }
  if (!tournament) {
    return (
      <main className="px-4">
        <div className="panel mx-auto max-w-lg p-6 text-center">
          <p className="text-lg font-semibold">{error ? "No se pudo cargar el torneo." : "Este torneo no existe."}</p>
          <Link href="/" className="btn btn-ghost mt-4">
            Ver torneos
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main>
      <TournamentView tournament={tournament} canEdit={isAdmin} />
    </main>
  );
}
