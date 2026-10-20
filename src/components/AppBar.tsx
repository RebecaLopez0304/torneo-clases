"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, ShieldCheck, Trophy, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";

export function AppBar() {
  const { user, loading, isAdmin, isOwner, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const name = user?.displayName || user?.email || "";

  return (
    <header className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-ink hover:text-gold">
        <Trophy className="size-5 text-gold" aria-hidden />
        Torneos
      </Link>

      {!firebaseConfigured ? null : loading ? (
        <span className="h-9 w-24 animate-pulse rounded-lg bg-navy-800" aria-hidden />
      ) : user ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-full border border-line bg-navy-850 py-1 pr-3 pl-1 hover:border-ink-muted"
          >
            <Avatar name={name} photo={user.photoURL} />
            <span className="max-w-[10rem] truncate text-sm">{name}</span>
            {isAdmin && <ShieldCheck className="size-4 text-gold" aria-label="Admin" />}
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-navy-900 shadow-2xl"
            >
              <div className="border-b border-line-soft px-4 py-3 text-sm">
                <p className="truncate font-semibold">{name}</p>
                <p className="text-ink-muted">
                  {isOwner ? "Cuenta principal" : isAdmin ? "Admin" : "Solo lectura"}
                </p>
              </div>
              {isOwner && (
                <Link
                  role="menuitem"
                  href="/admins"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-navy-800"
                >
                  <Users className="size-4" aria-hidden /> Administradores
                </Link>
              )}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-navy-800"
              >
                <LogOut className="size-4" aria-hidden /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      ) : pathname !== "/entrar" ? (
        <Link href={`/entrar?volver=${encodeURIComponent(pathname)}`} className="btn btn-ghost text-sm">
          <LogIn className="size-4" aria-hidden /> Iniciar sesión
        </Link>
      ) : null}
    </header>
  );
}

export function Avatar({ name, photo, size = 28 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} className="rounded-full" referrerPolicy="no-referrer" />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-navy-700 text-xs font-bold text-gold"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
