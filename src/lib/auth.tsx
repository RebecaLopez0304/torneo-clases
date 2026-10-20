"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, db, firebaseConfigured } from "./firebase";

type AuthContextValue = {
  user: User | null;
  /** true mientras Firebase resuelve la sesión inicial */
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveProfile(user: User, name?: string) {
  await setDoc(
    doc(db(), "users", user.uid),
    {
      name: name ?? user.displayName ?? user.email?.split("@")[0] ?? "Sin nombre",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      provider: user.providerData[0]?.providerId ?? "password",
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** La primera cuenta que entra queda como cuenta principal y admin. */
async function claimOwnershipIfFree(user: User) {
  const ownerRef = doc(db(), "meta", "owner");
  const owner = await getDoc(ownerRef);
  if (owner.exists()) return;
  const batch = writeBatch(db());
  batch.set(ownerRef, { uid: user.uid, createdAt: serverTimestamp() });
  batch.set(doc(db(), "admins", user.uid), {
    email: user.email ?? "",
    name: user.displayName ?? user.email ?? "",
    addedBy: user.uid,
    addedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch {
    // Otra cuenta la reclamó al mismo tiempo: las reglas rechazan la segunda.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth(), async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        try {
          await saveProfile(u);
          await claimOwnershipIfFree(u);
        } catch (err) {
          console.error("No se pudo preparar la cuenta", err);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onSnapshot(
      doc(db(), "meta", "owner"),
      (snap) => setOwnerUid((snap.data()?.uid as string | undefined) ?? null),
      () => setOwnerUid(null),
    );
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    return onSnapshot(
      doc(db(), "admins", user.uid),
      (snap) => setIsAdmin(snap.exists()),
      () => setIsAdmin(false),
    );
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth(), provider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth(), email.trim(), password);
  }, []);

  const registerWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    await saveProfile(cred.user, name.trim());
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth(), email.trim());
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin,
      isOwner: Boolean(user && ownerUid === user.uid),
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      logout,
    }),
    [user, loading, isAdmin, ownerUid, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-email": "Ese correo no tiene un formato válido.",
  "auth/missing-email": "Escribe tu correo.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "No hay ninguna cuenta con ese correo.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Espera un momento y vuelve a probar.",
  "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio.",
  "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
  "auth/cancelled-popup-request": "Cerraste la ventana de Google antes de terminar.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet y vuelve a probar.",
  "auth/operation-not-allowed": "Este método de acceso no está activado en Firebase.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Dominios autorizados).",
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) return AUTH_ERRORS[err.code] ?? `No se pudo completar (${err.code}).`;
  return "No se pudo completar. Vuelve a intentarlo.";
}
