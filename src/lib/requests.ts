"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { MAX_TEAMS, bracketSizeFor, syncSlots } from "./bracket";
import { currentActor } from "./actor";
import { db } from "./firebase";
import { checkTexts } from "./profanity";
import { fromSnap, ref as tournamentRef } from "./tournaments";
import type { Actor, JoinRequest, Team } from "./types";

const requestsCol = (tid: string) => collection(db(), "tournaments", tid, "requests");
const requestRef = (tid: string, uid: string) => doc(db(), "tournaments", tid, "requests", uid);

function fromData(d: DocumentData): JoinRequest {
  return {
    uid: d.uid,
    name: d.name ?? "",
    photoURL: d.photoURL ?? "",
    type: d.type === "create" ? "create" : "join",
    teamId: d.teamId ?? null,
    newTeam: d.newTeam ?? null,
    status: d.status ?? "pending",
    createdAt: d.createdAt ?? 0,
    updatedAt: d.updatedAt ?? 0,
    decidedBy: d.decidedBy ?? null,
    decidedAt: d.decidedAt ?? null,
  };
}

// ───────────────────────── Lectura ─────────────────────────

/** La inscripción de la cuenta actual en este torneo (o null si no tiene). */
export function useMyRequest(tid: string, uid: string | null) {
  const [state, setState] = useState<{ request: JoinRequest | null; loading: boolean }>({ request: null, loading: true });
  useEffect(() => {
    if (!uid) {
      setState({ request: null, loading: false });
      return;
    }
    return onSnapshot(
      requestRef(tid, uid),
      (snap) => setState({ request: snap.exists() ? fromData(snap.data()) : null, loading: false }),
      () => setState({ request: null, loading: false }),
    );
  }, [tid, uid]);
  return state;
}

/** Inscripciones aprobadas (públicas): integrantes con cuenta de cada equipo. */
export function useApprovedMembers(tid: string): Map<string, Actor[]> {
  const [list, setList] = useState<JoinRequest[]>([]);
  useEffect(
    () =>
      onSnapshot(
        query(requestsCol(tid), where("status", "==", "approved")),
        (snap) => setList(snap.docs.map((d) => fromData(d.data()))),
        () => setList([]),
      ),
    [tid],
  );
  return useMemo(() => {
    const byTeam = new Map<string, Actor[]>();
    for (const r of list) {
      if (!r.teamId) continue;
      byTeam.set(r.teamId, [...(byTeam.get(r.teamId) ?? []), { uid: r.uid, name: r.name }]);
    }
    return byTeam;
  }, [list]);
}

/** Todas las solicitudes (solo admins). */
export function useAllRequests(tid: string, enabled: boolean) {
  const [list, setList] = useState<JoinRequest[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      requestsCol(tid),
      (snap) => setList(snap.docs.map((d) => fromData(d.data())).sort((a, b) => a.createdAt - b.createdAt)),
      () => setList([]),
    );
  }, [tid, enabled]);
  return list;
}

// ───────────────────────── Cuenta que se inscribe ─────────────────────────

export type RequestInput = { type: "join"; teamId: string } | { type: "create"; name: string; color: string };

/** Crea o cambia la inscripción de la cuenta actual; siempre queda pendiente de aprobación. */
export async function submitRequest(tid: string, input: RequestInput, photoURL: string) {
  const me = currentActor();
  if (input.type === "create") {
    const name = input.name.trim();
    if (!name) throw new Error("Escribe el nombre del equipo.");
    const bad = checkTexts({ "Nombre del equipo": name });
    if (bad) throw new Error(bad);
  }
  const existing = await getDoc(requestRef(tid, me.uid));
  const now = Date.now();
  const data: JoinRequest = {
    uid: me.uid,
    name: me.name,
    photoURL,
    type: input.type,
    teamId: input.type === "join" ? input.teamId : null,
    newTeam: input.type === "create" ? { name: input.name.trim(), color: input.color } : null,
    status: "pending",
    createdAt: existing.exists() ? (existing.data().createdAt ?? now) : now,
    updatedAt: now,
    decidedBy: null,
    decidedAt: null,
  };
  await setDoc(requestRef(tid, me.uid), data);
}

/** Cancela la solicitud o sale del equipo (solo mientras el torneo está en preparación). */
export async function withdrawRequest(tid: string) {
  await deleteDoc(requestRef(tid, currentActor().uid));
}

// ───────────────────────── Admins ─────────────────────────

/** Aprueba una solicitud. Si propone un equipo nuevo, lo crea y la persona queda dentro. */
export async function approveRequest(tid: string, uid: string) {
  const admin = currentActor();
  await runTransaction(db(), async (tx) => {
    const t = fromSnap(await tx.get(tournamentRef(tid)));
    const snap = await tx.get(requestRef(tid, uid));
    if (!t) throw new Error("El torneo ya no existe.");
    if (!snap.exists()) throw new Error("La solicitud ya no existe.");
    if (t.status !== "draft") throw new Error("El torneo ya empezó: ya no se aceptan inscripciones.");
    const r = fromData(snap.data());
    const now = Date.now();
    const decision = { status: "approved", decidedBy: admin, decidedAt: now, updatedAt: now };

    if (r.type === "join") {
      if (!t.teams.some((x) => x.id === r.teamId)) throw new Error("Ese equipo ya no existe.");
      tx.update(requestRef(tid, uid), decision);
      return;
    }

    if (!r.newTeam) throw new Error("La solicitud no tiene equipo.");
    if (t.teams.length >= MAX_TEAMS) throw new Error(`El torneo ya tiene ${MAX_TEAMS} equipos.`);
    const name = r.newTeam.name.trim();
    if (t.teams.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Ya existe un equipo llamado ${name}.`);
    }
    const bad = checkTexts({ "Nombre del equipo": name });
    if (bad) throw new Error(bad);

    const team: Team = {
      id: crypto.randomUUID().replaceAll("-", "").slice(0, 10),
      name,
      color: r.newTeam.color,
      members: [],
      createdBy: { uid: r.uid, name: r.name },
    };
    const teams = [...t.teams, team];
    const ids = teams.map((x) => x.id);
    const size = bracketSizeFor(ids.length);
    tx.update(tournamentRef(tid), {
      teams,
      bracketSize: size,
      slots: syncSlots(t.slots, ids),
      drawnAt: size === t.bracketSize ? t.drawnAt : null,
      updatedAt: now,
      updatedBy: admin,
    });
    tx.update(requestRef(tid, uid), { ...decision, teamId: team.id });
  });
}

/** Rechaza una solicitud o saca a alguien de su equipo, dejando constancia de quién lo hizo. */
export async function rejectRequest(tid: string, uid: string) {
  const admin = currentActor();
  const now = Date.now();
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(requestRef(tid, uid));
    if (!snap.exists()) throw new Error("La solicitud ya no existe.");
    tx.update(requestRef(tid, uid), { status: "rejected", decidedBy: admin, decidedAt: now, updatedAt: now });
  });
}

