import { auth } from "./firebase";
import type { Actor } from "./types";

/** La cuenta con sesión iniciada, para registrar quién hizo cada cambio. */
export function currentActor(): Actor {
  const u = auth().currentUser;
  if (!u) throw new Error("Inicia sesión para continuar.");
  return { uid: u.uid, name: u.displayName || u.email?.split("@")[0] || "Sin nombre" };
}
