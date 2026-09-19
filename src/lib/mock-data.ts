import { Piece } from "./types";

export const mockPieces: Piece[] = [
  {
    id: "seed-1",
    tipo: "Blusas",
    ocasioes: ["Trabalho", "Casual"],
    cores: ["#C1694A"],
    peso: "Leve",
    favorita: true,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-2",
    tipo: "Calças",
    ocasioes: ["Trabalho"],
    cores: ["#262220"],
    peso: "Neutra",
    favorita: false,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-3",
    tipo: "Sapatos",
    ocasioes: ["Festa chique"],
    cores: ["#8B7355"],
    peso: "Neutra",
    favorita: true,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-4",
    tipo: "Acessórios",
    ocasioes: ["Casual", "Balada eletrônica"],
    cores: ["#5C7A54"],
    peso: "Leve",
    favorita: false,
    criadaEm: new Date().toISOString(),
  },
];
