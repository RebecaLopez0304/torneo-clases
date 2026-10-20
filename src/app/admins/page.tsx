"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { AppBar, Avatar } from "@/components/AppBar";
import { FirebaseMissing } from "@/components/FirebaseMissing";
import { useAuth } from "@/lib/auth";
import { db, firebaseConfigured } from "@/lib/firebase";

type Profile = { uid: string; name: string; email: string; photoURL: string };

export default function AdminsPage() {
  return (
    <>
      <AppBar />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16">
        {firebaseConfigured ? <AdminsManager /> : <FirebaseMissing />}
      </main>
    </>
  );
}

function AdminsManager() {
  const { user, loading, isOwner } = useAuth();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    const offUsers = onSnapshot(collection(db(), "users"), (snap) =>
      setProfiles(
        snap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Omit<Profile, "uid">) }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      ),
    );
    const offAdmins = onSnapshot(collection(db(), "admins"), (snap) => setAdminIds(new Set(snap.docs.map((d) => d.id))));
    return () => {
      offUsers();
      offAdmins();
    };
  }, [isOwner]);

  const sorted = useMemo(
    () => profiles?.slice().sort((a, b) => Number(b.uid === user?.uid) - Number(a.uid === user?.uid)) ?? null,
    [profiles, user],
  );

  if (loading) return null;
  if (!isOwner) {
    return (
      <div className="panel p-6">
        <h1 className="panel-title text-2xl">Administradores</h1>
        <p className="mt-2 text-ink-muted">Solo la cuenta principal puede gestionar quién administra los torneos.</p>
        <Link href="/" className="btn btn-ghost mt-4">
          Volver a los torneos
        </Link>
      </div>
    );
  }

  async function toggle(p: Profile, makeAdmin: boolean) {
    setPending(p.uid);
    try {
      const ref = doc(db(), "admins", p.uid);
      if (makeAdmin) {
        await setDoc(ref, { email: p.email, name: p.name, addedBy: user!.uid, addedAt: serverTimestamp() });
        toast.success(`${p.name} ya puede administrar torneos.`);
      } else {
        await deleteDoc(ref);
        toast.success(`${p.name} ya no puede editar.`);
      }
    } catch {
      toast.error("No se pudo cambiar el permiso. Revisa que las reglas de Firestore estén publicadas.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line-soft p-6">
        <h1 className="panel-title text-2xl">Administradores</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cualquiera puede crear una cuenta, pero solo edita quien tenga el permiso activado. Las personas aparecen aquí
          después de iniciar sesión por primera vez.
        </p>
      </div>
      {sorted === null ? (
        <p className="p-6 text-ink-muted">Cargando cuentas…</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {sorted.map((p) => {
            const isMe = p.uid === user?.uid;
            const isAdmin = adminIds.has(p.uid);
            return (
              <li key={p.uid} className="flex items-center gap-3 px-6 py-3">
                <Avatar name={p.name} photo={p.photoURL} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="truncate text-sm text-ink-muted">{p.email}</p>
                </div>
                {isMe ? (
                  <span className="flex items-center gap-1 text-sm font-semibold text-gold">
                    <Crown className="size-4" aria-hidden /> Cuenta principal
                  </span>
                ) : (
                  <Switch
                    checked={isAdmin}
                    disabled={pending === p.uid}
                    label={`Admin: ${p.name}`}
                    onChange={(v) => toggle(p, v)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <span className={checked ? "text-ink" : "text-ink-faint"}>Admin</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50",
          checked ? "border-gold bg-gold/80" : "border-line bg-navy-950",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 size-4.5 rounded-full bg-ink transition-transform",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
