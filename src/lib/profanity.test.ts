import { describe, expect, it } from "vitest";
import { checkTexts, findProfanity } from "./profanity";

describe("filtro de vulgaridades", () => {
  it.each([
    "puta",
    "Los Pendejos",
    "PENDEJÍSIMOS",
    "equipo chingón",
    "Vergas FC",
    "p3nd3j0s",
    "puuuuta madre",
    "p u t a",
    "p.u.t.a",
    "pen dejo",
    "hijo de puta",
    "Fucking Losers",
    "sh1t happens",
    "Los Culeros",
    "la perra",
  ])("bloquea %j", (text) => {
    expect(findProfanity(text)).not.toBeNull();
  });

  it.each([
    "Computadora Cuántica",
    "Los Normalizados",
    "Equipo 1",
    "Ingeniería de Software, 5.º semestre",
    "Disputa de datos",
    "Clase de Cálculo",
    "Pera y manzana",
    "As de picas",
    "El cono y la esfera",
    "Conchita López",
    "Cabrera",
    "Repútala no, refútala",
    "Recoger datos",
    "Asamblea",
    "Classic",
    "A01234567",
    "María Fernández",
  ])("permite %j", (text) => {
    expect(findProfanity(text)).toBeNull();
  });

  it("revisa varios campos e indica cuál falla", () => {
    expect(checkTexts({ "Nombre del equipo": "Los Pumas", Integrantes: ["Ana", "Luis"] })).toBeNull();
    expect(checkTexts({ "Nombre del equipo": "Los Pumas", Integrantes: ["Ana", "Pendejo"] })).toMatch(/^Integrantes:/);
  });
});
