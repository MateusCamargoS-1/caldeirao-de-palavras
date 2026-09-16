export type IngredientCategory =
  | "POWDER"
  | "CRYSTAL"
  | "HERB"
  | "CHUNK"
  | "LIQUID"
  | "VISCOUS";

export type Ingredient = {
  text: string;
  cat: IngredientCategory;
  color: string;
};

export type Recipe = {
  name: string;
  country: string;
  time: number;
  ingredients: Ingredient[];
};

export const RECIPES: Recipe[] = [
  {
    name: "Guacamole",
    country: "México",
    time: 55,
    ingredients: [
      { text: "ABACATE", cat: "CHUNK", color: "#5a9a3a" },
      { text: "TOMATE", cat: "CHUNK", color: "#d43a2a" },
      { text: "CEBOLA", cat: "CHUNK", color: "#e8c890" },
      { text: "LIMÃO", cat: "LIQUID", color: "#e8d840" },
      { text: "COENTRO", cat: "HERB", color: "#3a8a3a" },
      { text: "SAL", cat: "CRYSTAL", color: "#f0eeea" },
    ],
  },
  {
    name: "Limonada",
    country: "Brasil",
    time: 35,
    ingredients: [
      { text: "LIMÃO", cat: "LIQUID", color: "#e8d840" },
      { text: "AÇÚCAR", cat: "CRYSTAL", color: "#f5f0e0" },
      { text: "ÁGUA", cat: "LIQUID", color: "#6ac0e8" },
    ],
  },
  {
    name: "Molho Pesto",
    country: "Itália",
    time: 50,
    ingredients: [
      { text: "MANJERICÃO", cat: "HERB", color: "#2a7a2a" },
      { text: "ALHO", cat: "CHUNK", color: "#e8e0c8" },
      { text: "PARMESÃO", cat: "CRYSTAL", color: "#f0e0a0" },
      { text: "PINOLI", cat: "CHUNK", color: "#d8c080" },
      { text: "AZEITE", cat: "LIQUID", color: "#a0b830" },
      { text: "SAL", cat: "CRYSTAL", color: "#f0eeea" },
    ],
  },
  {
    name: "Panqueca",
    country: "França",
    time: 45,
    ingredients: [
      { text: "FARINHA", cat: "POWDER", color: "#e8d8b0" },
      { text: "LEITE", cat: "LIQUID", color: "#f0eee8" },
      { text: "OVO", cat: "CHUNK", color: "#f0d880" },
      { text: "AÇÚCAR", cat: "CRYSTAL", color: "#f5f0e0" },
      { text: "MANTEIGA", cat: "VISCOUS", color: "#f0c840" },
    ],
  },
  {
    name: "Molho de Tomate",
    country: "Itália",
    time: 50,
    ingredients: [
      { text: "TOMATE", cat: "CHUNK", color: "#d43a2a" },
      { text: "CEBOLA", cat: "CHUNK", color: "#e8c890" },
      { text: "ALHO", cat: "CHUNK", color: "#e8e0c8" },
      { text: "AZEITE", cat: "LIQUID", color: "#a0b830" },
      { text: "SAL", cat: "CRYSTAL", color: "#f0eeea" },
      { text: "MANJERICÃO", cat: "HERB", color: "#2a7a2a" },
    ],
  },
];

export const PRESETS: Record<
  IngredientCategory,
  { n: number; size: [number, number]; up: number; spread: number; g: number }
> = {
  POWDER: { n: 48, size: [3, 7], up: 2.2, spread: 3.5, g: 0.42 },
  CRYSTAL: { n: 40, size: [3.5, 8], up: 1.8, spread: 2.8, g: 0.48 },
  HERB: { n: 44, size: [4, 9], up: 2.8, spread: 4.0, g: 0.32 },
  CHUNK: { n: 36, size: [5, 11], up: 1.5, spread: 2.5, g: 0.52 },
  LIQUID: { n: 52, size: [3.5, 8], up: 1.4, spread: 3.0, g: 0.5 },
  VISCOUS: { n: 38, size: [4.5, 10], up: 1.2, spread: 2.2, g: 0.38 },
};

const ACCENT_MAP: Record<string, string> = {
  Á: "A",
  À: "A",
  Ã: "A",
  Â: "A",
  É: "E",
  Ê: "E",
  Í: "I",
  Ó: "O",
  Ô: "O",
  Õ: "O",
  Ú: "U",
  Ç: "C",
};

export function lettersMatch(incoming: string, expected: string) {
  const a = incoming.toUpperCase();
  const b = expected.toUpperCase();
  if (a === b) return true;
  return (ACCENT_MAP[a] || a) === (ACCENT_MAP[b] || b);
}
