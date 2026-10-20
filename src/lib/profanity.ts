// Filtro de vulgaridades para todo texto que escriben las personas (nombres de equipos, integrantes, torneos…).
// Compara palabras completas ya normalizadas para no bloquear palabras inocentes que contienen otra
// (por ejemplo "computadora" contiene "puta" pero no es una vulgaridad).

/** Palabras prohibidas exactas. */
const EXACT = [
  // Español
  "puta", "puto", "putas", "putos", "putita", "putito", "puteada", "putear", "putazo",
  "mierda", "mierdas", "verga", "vergas", "vergazo", "culo", "culos", "culero", "culera", "culeros",
  "cabron", "cabrona", "cabrones", "cabronas", "joto", "jotos", "marica", "maricon", "maricona", "maricones",
  "mamon", "mamona", "mamada", "mamadas", "ojete", "ojetes", "carajo", "joder", "jodido", "jodida",
  "follar", "coger", "cogida", "cogiendo", "panocha", "chichis", "tetas", "tetona", "pinche", "pinches",
  "nalgas", "zorra", "perra", "perras", "estupido", "estupida", "imbecil", "idiota", "pendejo", "pendeja",
  "pendejos", "pendejas", "pendejada", "pendejadas", "huevon", "guevon", "malparido", "malparida",
  "gonorrea", "hijueputa", "hdp", "ptm", "alv", "vrg", "pndj", "csm", "ctm", "pija", "pijas",
  "conchetumare", "boludo", "pelotudo", "orto", "porno", "violar", "violador", "nazi", "retrasado",
  "subnormal",
  // Inglés
  "fuck", "fucker", "fucking", "fucked", "shit", "shitty", "bitch", "bitches", "ass", "asshole", "dick",
  "dicks", "cock", "cunt", "pussy", "whore", "slut", "bastard", "nigga", "nigger", "fag", "faggot", "porn",
  "wtf", "stfu",
];

/** Raíces: cualquier palabra que empiece así se bloquea (pendejísimo, chingadera, vergudo…). */
const PREFIXES = [
  "chingad", "chingon", "chingar", "chinga", "pendej", "verguit", "vergot", "culer", "cabron", "mierd",
  "hijodeput", "hijueput", "malparid", "fuck", "motherf", "shit", "bitch", "nigg", "fagg", "putit",
  "putaz", "pute", "marico", "pornogr",
];

/** Frases de varias palabras. */
const PHRASES = ["hijo de puta", "hija de puta", "chinga tu madre", "a la verga", "vete a la mierda", "son of a bitch"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i", "|": "i" };

/** Minúsculas, sin acentos y leetspeak convertido a letras ("P3nd3j0" → "pendejo"). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$!|]/g, (c) => LEET[c] ?? c);
}

/** "puuuuta" → "puta" */
const collapse = (w: string) => w.replace(/([a-z])\1+/g, "$1");

const exact = new Set(EXACT);

function matches(word: string): boolean {
  return exact.has(word) || PREFIXES.some((p) => word.startsWith(p));
}

function badWord(word: string): boolean {
  return matches(word) || matches(collapse(word));
}

/** Devuelve la palabra ofensiva encontrada, o null si el texto está limpio. */
export function findProfanity(text: string): string | null {
  const words = normalize(text).split(/[^a-z]+/).filter(Boolean);
  for (const w of words) if (badWord(w)) return w;

  const joined = ` ${words.map(collapse).join(" ")} `;
  for (const p of PHRASES) if (joined.includes(` ${p} `)) return p;

  // Letras sueltas separadas para esquivar el filtro: "p u t a", "p.u.t.a", "p-u-t-a".
  let run = "";
  for (const w of [...words, ""]) {
    if (w.length === 1) {
      run += w;
      continue;
    }
    if (run.length >= 3 && badWord(run)) return run;
    run = "";
  }

  // Palabra partida en dos: "pen dejo", "ver-ga".
  for (let i = 0; i < words.length - 1; i++) {
    const pair = words[i] + words[i + 1];
    if (words[i].length <= 4 && badWord(pair)) return pair;
  }
  return null;
}

/**
 * Revisa varios campos a la vez. Devuelve un mensaje de error con el nombre del campo
 * (por ejemplo "Nombre del equipo") o null si todo está bien.
 */
export function checkTexts(fields: Record<string, string | string[] | undefined | null>): string | null {
  for (const [label, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value ?? ""]) {
      if (findProfanity(v)) return `${label}: contiene palabras no permitidas. Usa un lenguaje respetuoso.`;
    }
  }
  return null;
}
