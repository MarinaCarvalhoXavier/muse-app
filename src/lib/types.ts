export type Tipo = "Blusas" | "Calças" | "Sapatos" | "Acessórios";
export type Ocasiao = "Casual" | "Trabalho" | "Festa chique" | "Balada eletrônica";
export type Estacao = "Verão" | "Inverno" | "Outono" | "Primavera";
export type Clima = "Frio" | "Sol" | "Chuva";

export interface Piece {
  id: string;
  tipo: Tipo;
  ocasioes: Ocasiao[];
  cor: string;
  estacao: Estacao;
  clima: Clima;
  favorita: boolean;
  marca?: string;
  notas?: string;
  estampa?: string;
  criadaEm: string;
}

export interface Outfit {
  id: string;
  nome: string;
  pecaIds: string[];
  secoes: string[];
  criadoEm: string;
}
