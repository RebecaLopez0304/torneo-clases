"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Aviso para cuentas que iniciaron sesión pero aún no tienen permiso de edición. */
export function NoEditNotice() {
  const { user, loading, isAdmin } = useAuth();
  if (loading || !user || isAdmin) return null;
  return (
    <p className="mx-auto mb-4 flex max-w-[1500px] items-center gap-2 px-4 text-sm text-ink-muted sm:px-6">
      <Lock className="size-4 shrink-0" aria-hidden />
      Tu cuenta aún no puede editar. Pide a quien administra los torneos que te dé acceso.
    </p>
  );
}
