"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { AppBar } from "@/components/AppBar";
import { FirebaseMissing } from "@/components/FirebaseMissing";
import { authErrorMessage, useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";

type Mode = "login" | "register" | "reset";

export default function EntrarPage() {
  return (
    <>
      <AppBar />
      <main className="mx-auto max-w-md px-4 pt-6 pb-16">
        {firebaseConfigured ? (
          <Suspense>
            <LoginCard />
          </Suspense>
        ) : (
          <FirebaseMissing />
        )}
      </main>
    </>
  );
}

function safeReturn(path: string | null) {
  return path && path.startsWith("/") && !path.startsWith("//") && path !== "/entrar" ? path : "/";
}

function LoginCard() {
  const { user, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } = useAuth();
  const router = useRouter();
  const back = safeReturn(useSearchParams().get("volver"));
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace(back);
  }, [user, back, router]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") return run(() => signInWithEmail(email, password));
    if (mode === "register") {
      if (!name.trim()) return setError("Escribe tu nombre.");
      return run(() => registerWithEmail(name, email, password));
    }
    return run(async () => {
      await resetPassword(email);
      toast.success("Te enviamos un correo para restablecer tu contraseña.");
      setMode("login");
    });
  }

  return (
    <div className="panel p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <Trophy className="size-10 text-gold" aria-hidden />
        <h1 className="mt-2 font-display text-3xl font-extrabold">
          {mode === "register" ? "Crear cuenta" : mode === "reset" ? "Recuperar contraseña" : "Iniciar sesión"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {mode === "reset"
            ? "Te enviaremos un enlace para elegir una nueva contraseña."
            : "Para ver el torneo no necesitas cuenta. Inicia sesión para administrarlo."}
        </p>
      </div>

      {mode !== "reset" && (
        <>
          <div role="tablist" className="mt-6 grid grid-cols-2 rounded-lg border border-line bg-navy-950/60 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={clsx(
                  "rounded-md py-2 text-sm font-semibold",
                  mode === m ? "bg-navy-700 text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(signInWithGoogle)}
            className="btn mt-5 w-full bg-white text-[#1f2937] hover:bg-[#f1f5f9]"
          >
            <GoogleIcon /> Continuar con Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line-soft" /> o con tu correo <span className="h-px flex-1 bg-line-soft" />
          </div>
        </>
      )}

      <form onSubmit={submit} className={clsx("space-y-4", mode === "reset" && "mt-6")} noValidate>
        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block text-sm text-ink-muted">Nombre</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Correo</span>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />
        </label>
        {mode !== "reset" && (
          <label className="block">
            <span className="mb-1 block text-sm text-ink-muted">Contraseña</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            {mode === "register" && <span className="mt-1 block text-xs text-ink-faint">Mínimo 6 caracteres.</span>}
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-minus-edge bg-minus/60 px-3 py-2 text-sm text-[#ffd6e4]">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-gold w-full">
          {mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Enviar enlace"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        {mode === "reset" ? (
          <button type="button" className="text-ink-muted hover:text-gold" onClick={() => setMode("login")}>
            Volver a iniciar sesión
          </button>
        ) : mode === "login" ? (
          <button
            type="button"
            className="text-ink-muted hover:text-gold"
            onClick={() => {
              setMode("reset");
              setError(null);
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        ) : null}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
