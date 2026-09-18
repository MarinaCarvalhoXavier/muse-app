export type Tipo = string;
export type Ocasiao = string;
export type Estacao = "Verão" | "Inverno" | "Outono" | "Primavera" | "Chuva";

export interface Piece {
  id: string;
  tipo: Tipo;
  subtipos?: string[];
  ocasioes: Ocasiao[];
  cor: string;
  estacoes: Estacao[];
  favorita: boolean;
  marca?: string;
  notas?: string;
  estampa?: string;
  fotoUrl?: string;
  criadaEm: string;
}

export interface Outfit {
  id: string;
  nome: string;
  pecaIds: string[];
  secoes: string[];
  criadoEm: string;
}
