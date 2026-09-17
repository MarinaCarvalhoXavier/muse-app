import { Piece } from "./types";

export const mockPieces: Piece[] = [
  {
    id: "seed-1",
    tipo: "Blusas",
    ocasioes: ["Trabalho", "Casual"],
    cor: "#C1694A",
    estacoes: ["Outono", "Chuva"],
    favorita: true,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-2",
    tipo: "Calças",
    ocasioes: ["Trabalho"],
    cor: "#262220",
    estacoes: ["Inverno"],
    favorita: false,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-3",
    tipo: "Sapatos",
    ocasioes: ["Festa chique"],
    cor: "#8B7355",
    estacoes: ["Primavera"],
    favorita: true,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "seed-4",
    tipo: "Acessórios",
    ocasioes: ["Casual", "Balada eletrônica"],
    cor: "#5C7A54",
    estacoes: ["Verão"],
    favorita: false,
    criadaEm: new Date().toISOString(),
  },
];
