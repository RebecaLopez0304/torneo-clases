/** "puntos" → "punto", "goles" → "gol", "respuestas" → "respuesta" */
export function singular(unit: string) {
  if (/(l|r|n|d)es$/.test(unit)) return unit.slice(0, -2);
  if (unit.endsWith("s")) return unit.slice(0, -1);
  return unit;
}

/** "1 punto", "3 puntos" */
export function countLabel(n: number, unit: string) {
  return `${n} ${n === 1 ? singular(unit) : unit}`;
}
