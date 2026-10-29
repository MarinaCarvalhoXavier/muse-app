export type Tipo = string;
export type Ocasiao = string;
// Em vez de estação do ano (que não faz muito sentido num clima que é
// praticamente calor o ano todo, tipo Recife), classificamos pelo quanto
// a peça "esquenta" — ajuda mais no dia a dia.
export type Peso = "Leve" | "Neutra" | "Quente";

export interface Piece {
  id: string;
  tipo: Tipo;
  subtipos?: string[];
  ocasioes: Ocasiao[];
  cores: string[];
  peso?: Peso;
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

// Um registro de "Usei hoje": o look foi usado nesse dia (AAAA-MM-DD, horário local).
export interface Uso {
  id: string;
  outfitId: string;
  usadoEm: string;
}
