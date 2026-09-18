import { supabase } from "./supabase";
import { Estacao, Ocasiao, Outfit, Piece, Tipo } from "./types";

// ---------------------------------------------------------------------------
// Peças e looks — persistidos no Supabase
// ---------------------------------------------------------------------------

type PieceRow = {
  id: string;
  tipo: string;
  ocasioes: string[];
  cor: string;
  estacoes: string[];
  favorita: boolean;
  marca: string | null;
  notas: string | null;
  estampa: string | null;
  foto_url: string | null;
  criada_em: string;
};

type OutfitRow = {
  id: string;
  nome: string;
  peca_ids: string[];
  secoes: string[];
  criado_em: string;
};

function rowToPiece(row: PieceRow): Piece {
  return {
    id: row.id,
    tipo: row.tipo,
    ocasioes: row.ocasioes ?? [],
    cor: row.cor,
    estacoes: (row.estacoes ?? []) as Estacao[],
    favorita: row.favorita,
    marca: row.marca ?? undefined,
    notas: row.notas ?? undefined,
    estampa: row.estampa ?? undefined,
    fotoUrl: row.foto_url ?? undefined,
    criadaEm: row.criada_em,
  };
}

function rowToOutfit(row: OutfitRow): Outfit {
  return {
    id: row.id,
    nome: row.nome,
    pecaIds: row.peca_ids ?? [],
    secoes: row.secoes ?? [],
    criadoEm: row.criado_em,
  };
}

export async function getPieces(): Promise<Piece[]> {
  const { data, error } = await supabase
    .from("pieces")
    .select("*")
    .order("criada_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar peças:", error.message);
    return [];
  }
  return (data as PieceRow[]).map(rowToPiece);
}

export async function getPieceById(id: string): Promise<Piece | null> {
  const { data, error } = await supabase
    .from("pieces")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erro ao buscar peça:", error.message);
    return null;
  }
  return rowToPiece(data as PieceRow);
}

export async function addPiece(piece: Piece): Promise<{ error?: string }> {
  const { error } = await supabase.from("pieces").insert({
    id: piece.id,
    tipo: piece.tipo,
    ocasioes: piece.ocasioes,
    cor: piece.cor,
    estacoes: piece.estacoes,
    favorita: piece.favorita,
    marca: piece.marca ?? null,
    notas: piece.notas ?? null,
    estampa: piece.estampa ?? null,
    foto_url: piece.fotoUrl ?? null,
    criada_em: piece.criadaEm,
  });

  if (error) {
    console.error("Erro ao salvar peça:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function updateFavorita(id: string, favorita: boolean): Promise<{ error?: string }> {
  const { error } = await supabase.from("pieces").update({ favorita }).eq("id", id);
  if (error) {
    console.error("Erro ao atualizar favorita:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function deletePiece(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("pieces").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir peça:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function getOutfits(): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar outfits:", error.message);
    return [];
  }
  return (data as OutfitRow[]).map(rowToOutfit);
}

export async function addOutfit(outfit: Outfit): Promise<{ error?: string }> {
  const { error } = await supabase.from("outfits").insert({
    id: outfit.id,
    nome: outfit.nome,
    peca_ids: outfit.pecaIds,
    secoes: outfit.secoes,
    criado_em: outfit.criadoEm,
  });

  if (error) {
    console.error("Erro ao salvar outfit:", error.message);
    return { error: error.message };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Listas personalizadas (tipos, ocasiões, cores criados por você) —
// preferências leves, guardadas no navegador. Não são dados do guarda-roupa
// em si, então continuam no localStorage mesmo depois do Supabase entrar.
// ---------------------------------------------------------------------------

const CUSTOM_TIPOS_KEY = "muse:custom-tipos";
const CUSTOM_OCASIOES_KEY = "muse:custom-ocasioes";
const CUSTOM_CORES_KEY = "muse:custom-cores";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function appendToList(key: string, value: string) {
  if (typeof window === "undefined") return;
  const current = readList(key);
  if (current.includes(value)) return;
  window.localStorage.setItem(key, JSON.stringify([...current, value]));
}

export function getCustomTipos(): Tipo[] {
  return readList(CUSTOM_TIPOS_KEY);
}

export function addCustomTipo(tipo: Tipo) {
  appendToList(CUSTOM_TIPOS_KEY, tipo);
}

export function getCustomOcasioes(): Ocasiao[] {
  return readList(CUSTOM_OCASIOES_KEY);
}

export function addCustomOcasiao(ocasiao: Ocasiao) {
  appendToList(CUSTOM_OCASIOES_KEY, ocasiao);
}

export function getCustomCores(): string[] {
  return readList(CUSTOM_CORES_KEY);
}

export function addCustomCor(cor: string) {
  appendToList(CUSTOM_CORES_KEY, cor);
}
