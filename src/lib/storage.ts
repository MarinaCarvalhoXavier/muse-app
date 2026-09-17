"use client";

import { Outfit, Piece } from "./types";
import { mockPieces } from "./mock-data";

const PIECES_KEY = "muse:pieces";
const OUTFITS_KEY = "muse:outfits";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getPieces(): Piece[] {
  return read<Piece[]>(PIECES_KEY, mockPieces);
}

export function addPiece(piece: Piece) {
  const pieces = getPieces();
  write(PIECES_KEY, [piece, ...pieces]);
}

export function getOutfits(): Outfit[] {
  return read<Outfit[]>(OUTFITS_KEY, []);
}

export function addOutfit(outfit: Outfit) {
  const outfits = getOutfits();
  write(OUTFITS_KEY, [outfit, ...outfits]);
}
