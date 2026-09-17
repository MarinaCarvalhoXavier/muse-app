"use client";

import { useEffect, useState } from "react";
import { Piece, Tipo } from "@/lib/types";
import { getPieces } from "@/lib/storage";
import { PieceCard } from "@/components/piece-card";

const ORDEM: Tipo[] = ["Blusas", "Calças", "Sapatos", "Acessórios"];

export default function ArmarioPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    setPieces(getPieces());
  }, []);

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Muse</p>
        <h1 className="font-[var(--font-fraunces)] text-2xl">Seu armário</h1>
        <p className="text-sm text-black/50">{pieces.length} peças catalogadas</p>
      </header>

      {ORDEM.map((tipo) => {
        const items = pieces.filter((p) => p.tipo === tipo);
        if (items.length === 0) return null;
        return (
          <section key={tipo} className="mb-8">
            <h2 className="mb-3 font-[var(--font-fraunces)] text-lg">{tipo}</h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map((piece) => (
                <PieceCard key={piece.id} piece={piece} />
              ))}
            </div>
          </section>
        );
      })}

      {pieces.length === 0 && (
        <p className="mt-16 text-center text-sm text-black/40">
          Nenhuma peça ainda. Toque no + para adicionar a primeira.
        </p>
      )}
    </main>
  );
}
