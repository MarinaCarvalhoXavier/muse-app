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

export interface OutfitItem {
  id: string;
  pecaId: string;
  x: number; // % da largura do canvas (posição do canto superior esquerdo)
  y: number; // % da altura do canvas
  largura: number; // % da largura do canvas
  fotoSemFundoUrl?: string; // versão dessa foto com fundo removido, só pra esse look
}

export interface Outfit {
  id: string;
  nome: string;
  itens: OutfitItem[];
  criadoEm: string;
}
