"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { AppBar } from "@/components/AppBar";
import { ConfirmDialog } from "@/components/Dialog";
import { GeneralForm } from "@/components/GeneralForm";
import { RequireAdmin } from "@/components/RequireAdmin";
import { SlotsEditor } from "@/components/SlotsEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamsEditor } from "@/components/TeamsEditor";
import { backToDraft, deleteTournament, updateGeneral, useTournament } from "@/lib/tournaments";
import type { Tournament } from "@/lib/types";

const TABS = [
  { id: "general", label: "General" },
  { id: "equipos", label: "Equipos" },
  { id: "cruces", label: "Cruces" },
  { id: "opciones", label: "Más opciones" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function ConfigurarPage() {
  return (
    <>
      <AppBar />
      <main className="mx-auto max-w-4xl px-4 pt-2 pb-16 sm:px-6">
        <RequireAdmin>
          <Suspense>
            <Configurar />
          </Suspense>
        </RequireAdmin>
      </main>
    </>
  );
}

function Configurar() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { tournament, loading } = useTournament(id);
  const requested = params.get("tab");
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : "general";

  if (loading) return <div className="panel h-64 animate-pulse" />;
  if (!tournament) {
    return (
      <div className="panel p-6">
        <p>Este torneo no existe o fue eliminado.</p>
        <Link href="/" className="btn btn-ghost mt-4">
          Ver torneos
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href={`/t/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-gold">
        <ArrowLeft className="size-4" aria-hidden /> Ver torneo
      </Link>
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 pt-6 pb-4">
          <h1 className="panel-title truncate text-3xl">{tournament.name}</h1>
          <StatusBadge status={tournament.status} />
        </div>
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line-soft px-4 [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => router.replace(`/t/${id}/configurar?tab=${t.id}`, { scroll: false })}
              className={clsx(
                "-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-semibold",
                tab === t.id ? "border-gold text-gold" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "general" && <GeneralTab tournament={tournament} />}
          {tab === "equipos" && <TeamsEditor tournament={tournament} />}
          {tab === "cruces" && <SlotsEditor tournament={tournament} />}
          {tab === "opciones" && <OptionsTab tournament={tournament} />}
        </div>
      </div>
    </>
  );
}

function GeneralTab({ tournament: t }: { tournament: Tournament }) {
  return (
    <GeneralForm
      key={JSON.stringify([t.name, t.subtitle, t.scoreUnit, t.scoreSteps, t.roundDurationSec])}
      initial={{
        name: t.name,
        subtitle: t.subtitle,
        scoreUnit: t.scoreUnit,
        scoreSteps: t.scoreSteps,
        roundDurationSec: t.roundDurationSec,
      }}
      submitLabel="Guardar cambios"
      onSubmit={async (s) => {
        await updateGeneral(t.id, s);
        toast.success("Cambios guardados.");
      }}
    />
  );
}

function OptionsTab({ tournament: t }: { tournament: Tournament }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"reset" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await action();
      toast.success(ok);
      setDialog(null);
    } catch {
      toast.error("No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line-soft p-4">
        <div className="max-w-md">
          <h2 className="font-semibold">Volver a preparación</h2>
          <p className="text-sm text-ink-muted">
            Borra todos los resultados y vuelve a abrir la inscripción y los cruces. Los equipos se conservan.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={t.status === "draft"}
          onClick={() => setDialog("reset")}
        >
          Volver a preparación
        </button>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-minus-edge/60 p-4">
        <div className="max-w-md">
          <h2 className="font-semibold">Eliminar torneo</h2>
          <p className="text-sm text-ink-muted">Se borra para todos, con sus equipos y resultados. No se puede deshacer.</p>
        </div>
        <button type="button" className="btn btn-danger" onClick={() => setDialog("delete")}>
          Eliminar torneo
        </button>
      </section>

      <ConfirmDialog
        open={dialog === "reset"}
        title="Volver a preparación"
        message="Se borrarán todos los marcadores y el campeón. ¿Continuar?"
        confirmLabel="Borrar resultados"
        danger
        busy={busy}
        onConfirm={() => run(() => backToDraft(t.id), "El torneo volvió a preparación.")}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title="Eliminar torneo"
        message={
          <>
            Se eliminará <strong className="text-ink">{t.name}</strong> para todos. No se puede deshacer.
          </>
        }
        confirmLabel="Eliminar torneo"
        danger
        busy={busy}
        onConfirm={() =>
          run(async () => {
            await deleteTournament(t.id);
            router.replace("/");
          }, "Torneo eliminado.")
        }
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
