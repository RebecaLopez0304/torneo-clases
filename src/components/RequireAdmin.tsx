"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { FirebaseMissing } from "./FirebaseMissing";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (!firebaseConfigured) return <FirebaseMissing />;
  if (loading) return <div className="panel h-48 animate-pulse" />;
  if (isAdmin) return <>{children}</>;
  return (
    <div className="panel mx-auto max-w-lg p-6 text-center">
      <Lock className="mx-auto size-8 text-gold" aria-hidden />
      <h1 className="mt-2 font-display text-2xl font-bold">Solo para administradores</h1>
      <p className="mt-2 text-ink-muted">
        {user
          ? "Tu cuenta aún no puede editar. Pide a quien administra los torneos que te dé acceso."
          : "Inicia sesión con una cuenta de administrador para continuar."}
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <Link href="/" className="btn btn-ghost">
          Ver torneos
        </Link>
        {!user && (
          <Link href="/entrar" className="btn btn-gold">
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
