"use client";

import { useRouter } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { DEFAULT_SETTINGS, GeneralForm } from "@/components/GeneralForm";
import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/lib/auth";
import { createTournament } from "@/lib/tournaments";

export default function NuevoPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <>
      <AppBar />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6">
        <RequireAdmin>
          <div className="panel p-6 sm:p-8">
            <h1 className="panel-title text-3xl">Nuevo torneo</h1>
            <p className="mt-1 mb-6 text-ink-muted">Después de crearlo inscribirás a los equipos y sortearás los cruces.</p>
            <GeneralForm
              initial={DEFAULT_SETTINGS}
              submitLabel="Crear torneo"
              onSubmit={async (s) => {
                const id = await createTournament(s, user!.uid);
                router.push(`/t/${id}/configurar?tab=equipos`);
              }}
            />
          </div>
        </RequireAdmin>
      </main>
    </>
  );
}
