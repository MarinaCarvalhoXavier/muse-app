"use client";

import { useEffect, useMemo, useState } from "react";
import { Piece } from "@/lib/types";
import { getPieces, updateFavorita } from "@/lib/storage";
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
  const [filtro, setFiltro] = useState<string>("Todas");

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

  const tipos = useMemo(
    () => ordenarTipos(Array.from(new Set(pieces.map((p) => p.tipo)))),
    [pieces]
  );

  async function handleToggleFavorita(piece: Piece) {
    const novoValor = !piece.favorita;
    setPieces((prev) =>
      prev.map((p) => (p.id === piece.id ? { ...p, favorita: novoValor } : p))
    );
    const { error } = await updateFavorita(piece.id, novoValor);
    if (error) {
      // reverte se der erro ao salvar
      setPieces((prev) =>
        prev.map((p) => (p.id === piece.id ? { ...p, favorita: piece.favorita } : p))
      );
    }
  }

  const filtros = ["Todas", "Curtidas", ...tipos];

  const piecesFiltradas =
    filtro === "Todas"
      ? null // null = usa o agrupamento por tipo (comportamento padrão)
      : filtro === "Curtidas"
      ? pieces.filter((p) => p.favorita)
      : pieces.filter((p) => p.tipo === filtro);

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Muse</p>
        <h1 className="font-[var(--font-fraunces)] text-2xl">Seu armário</h1>
        <p className="text-sm text-black/50">
          {carregando ? "Carregando…" : `${pieces.length} peças catalogadas`}
        </p>
      </header>

      {!carregando && pieces.length > 0 && (
        <div className="mb-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {filtros.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
                filtro === f
                  ? "border-[var(--color-terracota)] bg-[var(--color-terracota)] text-white"
                  : "border-black/10 text-black/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {piecesFiltradas === null ? (
        tipos.map((tipo) => {
          const items = pieces.filter((p) => p.tipo === tipo);
          return (
            <section key={tipo} className="mb-8">
              <h2 className="mb-3 font-[var(--font-fraunces)] text-lg">{tipo}</h2>
              <div className="grid grid-cols-2 gap-3">
                {items.map((piece) => (
                  <PieceCard key={piece.id} piece={piece} onToggleFavorita={handleToggleFavorita} />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3">
            {piecesFiltradas.map((piece) => (
              <PieceCard key={piece.id} piece={piece} onToggleFavorita={handleToggleFavorita} />
            ))}
          </div>
          {piecesFiltradas.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/40">Nenhuma peça aqui ainda.</p>
          )}
        </section>
      )}

      {!carregando && pieces.length === 0 && (
        <p className="mt-16 text-center text-sm text-black/40">
          Nenhuma peça ainda. Toque no + para adicionar a primeira.
        </p>
      )}
    </main>
  );
}
