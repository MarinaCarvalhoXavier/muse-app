"use client";

import { useEffect, useState } from "react";
import { Piece } from "@/lib/types";
import { getPieces } from "@/lib/storage";
import { PieceCard } from "@/components/piece-card";

const ORDEM_PADRAO = ["Blusas", "Calças", "Sapatos", "Acessórios"];

function ordenarTipos(tipos: string[]): string[] {
  const padrao = ORDEM_PADRAO.filter((t) => tipos.includes(t));
  const extras = tipos.filter((t) => !ORDEM_PADRAO.includes(t)).sort();
  return [...padrao, ...extras];
}

export default function ArmarioPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    getPieces().then((data) => {
      if (ativo) {
        setPieces(data);
        setCarregando(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  const tipos = ordenarTipos(Array.from(new Set(pieces.map((p) => p.tipo))));

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Muse</p>
        <h1 className="font-[var(--font-fraunces)] text-2xl">Seu armário</h1>
        <p className="text-sm text-black/50">
          {carregando ? "Carregando…" : `${pieces.length} peças catalogadas`}
        </p>
      </header>

      {tipos.map((tipo) => {
        const items = pieces.filter((p) => p.tipo === tipo);
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

      {!carregando && pieces.length === 0 && (
        <p className="mt-16 text-center text-sm text-black/40">
          Nenhuma peça ainda. Toque no + para adicionar a primeira.
        </p>
      )}
    </main>
  );
}
