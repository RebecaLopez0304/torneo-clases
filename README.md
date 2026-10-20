# Torneo de clases

Torneos por eliminatorias entre equipos de una clase, con cuadro de eliminatorias y marcador en vivo.
Hecho con Next.js 15 y Firebase (Authentication + Firestore).

- **Público:** cualquiera ve el torneo sin iniciar sesión; el marcador y el reloj se actualizan solos.
- **Administradores:** crean torneos, inscriben equipos (con sus integrantes, sin que necesiten cuenta),
  sortean los cruces, llevan el marcador y el reloj, y finalizan partidos.
- **Cuenta principal:** la primera cuenta que inicia sesión. Es la única que da o quita permisos de admin
  desde **Administradores** (menú de la cuenta).

## Cómo funciona un torneo

1. **Preparación:** se inscriben de 2 a 16 equipos. El cuadro usa 4, 8 o 16 lugares; si sobran, algunos
   equipos reciben **pase directo** a la siguiente ronda. Los cruces se arman con **Sortear al azar**
   (se puede repetir) o a mano con los selectores. El público solo ve "Esperando que inicie el torneo".
2. **Iniciar torneo:** los cruces quedan fijos y los pases directos avanzan solos.
3. **En curso:** se elige el partido que va al marcador, se suman o restan puntos, y se usa el reloj
   regresivo (pausar, reanudar, reiniciar). **Finalizar partido** avanza a quien tenga más puntos; en
   empate se elige quién pasa. Un partido se puede reabrir mientras el siguiente no haya empezado.
4. **Finalizado:** el camino del campeón se ilumina en dorado.

La unidad del marcador ("puntos", "aciertos"…), los incrementos (±1, ±5…) y la duración de cada ronda
se configuran por torneo.

## Configurar Firebase

1. En [console.firebase.google.com](https://console.firebase.google.com) crea un proyecto.
2. **Configuración del proyecto → Tus apps → Web (`</>`)**: registra una app web y copia el `firebaseConfig`.
3. **Authentication → Sign-in method:** habilita **Google** y **Correo electrónico/contraseña**.
4. **Firestore Database → Crear base de datos** (modo producción).
5. **Firestore → Reglas:** pega el contenido de [`firestore.rules`](firestore.rules) y publica.
   Hazlo **antes** de que alguien inicie sesión: la primera cuenta queda como cuenta principal.
   (Con la CLI: `firebase deploy --only firestore:rules`.)
6. Cuando despliegues, agrega el dominio en **Authentication → Configuración → Dominios autorizados**.

## Desarrollo local

```bash
cp .env.example .env.local   # y rellena los valores del firebaseConfig
npm install
npm run dev                  # http://localhost:3000
```

| Comando         | Qué hace                                  |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Servidor de desarrollo                    |
| `npm run build` | Build de producción                       |
| `npm run lint`  | ESLint                                    |
| `npm test`      | Pruebas de la lógica del cuadro (Vitest)  |

## Desplegar en Vercel

1. Importa el repositorio en [vercel.com/new](https://vercel.com/new).
2. En **Environment Variables** agrega las seis variables `NEXT_PUBLIC_FIREBASE_*` de `.env.example`.
3. Despliega y agrega el dominio `*.vercel.app` (o el tuyo) a los dominios autorizados de Firebase.

## Estructura

```
src/app/                 páginas: inicio, /entrar, /admins, /nuevo, /t/[id], /t/[id]/configurar, /api/time
src/components/          Bracket, Scoreboard, TournamentView, editores de equipos y cruces…
src/lib/bracket.ts       lógica pura: sorteo, pases directos, avance, reloj (con pruebas)
src/lib/tournaments.ts   lectura en tiempo real y escrituras en transacción
src/lib/auth.tsx         sesión, cuenta principal y rol admin
firestore.rules          quién puede leer y escribir
```

El reloj de cada partido se guarda como "tiempo restante + hora de inicio" y cada pantalla calcula el
tiempo con la hora del servidor (`/api/time`), así coincide en todos los dispositivos.
