import { exigirDona } from "@/lib/sessao";
import { supabase } from "./supabase";
import { Ocasiao, Outfit, OutfitItem, Peso, Piece, Tipo, Uso } from "./types";

// ---------------------------------------------------------------------------
// Peças e looks — persistidos no Supabase
// ---------------------------------------------------------------------------

type PieceRow = {
  id: string;
  tipo: string;
  subtipos: string[] | null;
  ocasioes: string[];
  cores: string[];
  peso: string | null;
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
  itens: OutfitItem[] | null;
  criado_em: string;
};

function rowToPiece(row: PieceRow): Piece {
  return {
    id: row.id,
    tipo: row.tipo,
    subtipos: row.subtipos ?? [],
    ocasioes: row.ocasioes ?? [],
    cores: row.cores ?? [],
    peso: (row.peso as Peso | null) ?? undefined,
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
    itens: row.itens ?? [],
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
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { error } = await supabase.from("pieces").insert({
    id: piece.id,
    tipo: piece.tipo,
    subtipos: piece.subtipos ?? [],
    ocasioes: piece.ocasioes,
    cores: piece.cores ?? [],
    peso: piece.peso ?? null,
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

export async function updatePiece(piece: Piece): Promise<{ error?: string }> {
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { error } = await supabase
    .from("pieces")
    .update({
      tipo: piece.tipo,
      subtipos: piece.subtipos ?? [],
      ocasioes: piece.ocasioes,
      cores: piece.cores ?? [],
      peso: piece.peso ?? null,
      favorita: piece.favorita,
      marca: piece.marca ?? null,
      notas: piece.notas ?? null,
      estampa: piece.estampa ?? null,
      foto_url: piece.fotoUrl ?? null,
    })
    .eq("id", piece.id);

  if (error) {
    console.error("Erro ao atualizar peça:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function updateFavorita(id: string, favorita: boolean): Promise<{ error?: string }> {
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { error } = await supabase.from("pieces").update({ favorita }).eq("id", id);
  if (error) {
    console.error("Erro ao atualizar favorita:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function deletePiece(id: string): Promise<{ error?: string }> {
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { error } = await supabase.from("pieces").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir peça:", error.message);
    return { error: error.message };
  }
  return {};
}

// ---------------------------------------------------------------------------
// "Usei hoje": registro de uso dos looks
// ---------------------------------------------------------------------------

/** Data de hoje no horário do aparelho, no formato AAAA-MM-DD. */
export function hojeLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export async function getUsos(): Promise<{ usos: Uso[]; tabelaExiste: boolean }> {
  const { data, error } = await supabase
    .from("usos")
    .select("id, outfit_id, usado_em")
    .order("usado_em", { ascending: false });
  if (error) {
    console.error("Erro ao buscar usos:", error.message);
    return { usos: [], tabelaExiste: false };
  }
  return {
    usos: (data as { id: string; outfit_id: string; usado_em: string }[]).map((r) => ({
      id: r.id,
      outfitId: r.outfit_id,
      usadoEm: r.usado_em,
    })),
    tabelaExiste: true,
  };
}

export async function registrarUso(outfitId: string, dia: string): Promise<{ uso?: Uso; error?: string }> {
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { data, error } = await supabase
    .from("usos")
    .upsert({ outfit_id: outfitId, usado_em: dia }, { onConflict: "outfit_id,usado_em" })
    .select("id, outfit_id, usado_em")
    .single();
  if (error) {
    console.error("Erro ao registrar uso:", error.message);
    return { error: error.message };
  }
  return { uso: { id: data.id, outfitId: data.outfit_id, usadoEm: data.usado_em } };
}

export async function removerUso(outfitId: string, dia: string): Promise<{ error?: string }> {
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { error } = await supabase.from("usos").delete().eq("outfit_id", outfitId).eq("usado_em", dia);
  if (error) {
    console.error("Erro ao remover uso:", error.message);
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
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { error } = await supabase.from("outfits").insert({
    id: outfit.id,
    nome: outfit.nome,
    itens: outfit.itens ?? [],
    criado_em: outfit.criadoEm,
  });

  if (error) {
    console.error("Erro ao salvar outfit:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function getOutfitById(id: string): Promise<Outfit | null> {
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Erro ao buscar outfit:", error.message);
    return null;
  }
  return rowToOutfit(data as OutfitRow);
}

export async function updateOutfit(
  id: string,
  updates: { nome?: string; itens?: OutfitItem[] }
): Promise<{ error?: string }> {
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const payload: Record<string, unknown> = {};
  if (updates.nome !== undefined) payload.nome = updates.nome;
  if (updates.itens !== undefined) payload.itens = updates.itens;

  const { error } = await supabase.from("outfits").update(payload).eq("id", id);
  if (error) {
    console.error("Erro ao atualizar outfit:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function deleteOutfit(id: string): Promise<{ error?: string }> {
  const bloqueio = await exigirDona();
  if (bloqueio) return { error: bloqueio };
  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir outfit:", error.message);
    return { error: error.message };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Listas personalizadas (tipos, ocasiões, cores criados por você) —
// preferências leves, guardadas no navegador. Não são dados do guarda-roupa
// em si, então continuam no localStorage mesmo depois do Supabase entrar.
// ---------------------------------------------------------------------------

const CUSTOM_TIPOS_KEY = "muse:custom-tipos-v2";
const CUSTOM_OCASIOES_KEY = "muse:custom-ocasioes";
// v3: a v2 ficou cheia de tons repetidos por causa de um bug no seletor de cor
// (cada movimento do dedo no espectro virava uma cor nova). Trocar a chave limpa tudo.
const CUSTOM_CORES_KEY = "muse:custom-cores-v3";
const MAX_CORES_PERSONALIZADAS = 8;

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

// Subtipos são guardados por tipo principal (ex: os subtipos de "Parte de
// cima" são uma lista separada dos de "Sapatos").
function customSubtiposKey(tipoPrincipal: string): string {
  return `muse:custom-subtipos:${tipoPrincipal}`;
}

export function getCustomSubtipos(tipoPrincipal: string): string[] {
  return readList(customSubtiposKey(tipoPrincipal));
}

export function addCustomSubtipo(tipoPrincipal: string, subtipo: string) {
  appendToList(customSubtiposKey(tipoPrincipal), subtipo);
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
  if (typeof window === "undefined") return;
  const atuais = readList(CUSTOM_CORES_KEY).filter((c) => c.toLowerCase() !== cor.toLowerCase());
  // Guarda só as últimas cores personalizadas, pra paleta nunca encher demais.
  const novas = [...atuais, cor].slice(-MAX_CORES_PERSONALIZADAS);
  window.localStorage.setItem(CUSTOM_CORES_KEY, JSON.stringify(novas));
}

export function limparCustomCores() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOM_CORES_KEY);
  window.localStorage.removeItem("muse:custom-cores-v2");
}
