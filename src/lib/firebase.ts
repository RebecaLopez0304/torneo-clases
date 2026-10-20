import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** false si faltan las variables NEXT_PUBLIC_FIREBASE_* (ver .env.example). */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

// Se inicializan bajo demanda para que el build y el render en servidor no toquen Firebase.
export function auth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app());
    authInstance.languageCode = "es";
  }
  return authInstance;
}

export function db(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(app());
  return dbInstance;
}
