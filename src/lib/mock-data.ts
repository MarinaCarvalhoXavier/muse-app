import { Piece } from "./types";

export const mockPieces: Piece[] = [
  {
    id: "seed-1",
    tipo: "Blusas",
    ocasioes: ["Trabalho", "Casual"],
    cor: "#C1694A",
    estacao: "Outono",
    clima: "Frio",
    favorita: true,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-2",
    tipo: "Calças",
    ocasioes: ["Trabalho"],
    cor: "#262220",
    estacao: "Inverno",
    clima: "Frio",
    favorita: false,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-3",
    tipo: "Sapatos",
    ocasioes: ["Festa chique"],
    cor: "#8B7355",
    estacao: "Primavera",
    clima: "Sol",
    favorita: true,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-4",
    tipo: "Acessórios",
    ocasioes: ["Casual", "Balada eletrônica"],
    cor: "#5C7A54",
    estacao: "Verão",
    clima: "Sol",
    favorita: false,
    criadaEm: new Date().toISOString(),
  },
];
