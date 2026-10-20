/** Colores de escudo disponibles para los equipos. */
export const TEAM_COLORS = [
  { hex: "#2f8cff", name: "Azul" },
  { hex: "#ff3fa4", name: "Rosa" },
  { hex: "#8b5cf6", name: "Violeta" },
  { hex: "#22c55e", name: "Verde" },
  { hex: "#ef4444", name: "Rojo" },
  { hex: "#facc15", name: "Amarillo" },
  { hex: "#22d3ee", name: "Cian" },
  { hex: "#f97316", name: "Naranja" },
  { hex: "#a3e635", name: "Lima" },
  { hex: "#d946ef", name: "Magenta" },
  { hex: "#14b8a6", name: "Turquesa" },
  { hex: "#fb7185", name: "Coral" },
  { hex: "#6366f1", name: "Índigo" },
  { hex: "#e2e8f0", name: "Plata" },
  { hex: "#c08443", name: "Bronce" },
  { hex: "#84cc16", name: "Oliva" },
];

export const PLACEHOLDER_COLOR = "#5d75a8";

/** Primer color que aún no usa ningún equipo. */
export function nextFreeColor(used: string[]): string {
  return TEAM_COLORS.find((c) => !used.includes(c.hex))?.hex ?? TEAM_COLORS[used.length % TEAM_COLORS.length].hex;
}
