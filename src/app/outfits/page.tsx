"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Outfit, Piece } from "@/lib/types";
import { getOutfits, getPieces } from "@/lib/storage";

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([getOutfits(), getPieces()]).then(([o, p]) => {
      if (!ativo) return;
      setOutfits(o);
      setPieces(p);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  function pecaPorId(id: string) {
    return pieces.find((p) => p.id === id);
  }

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Muse</p>
          <h1 className="font-[var(--font-fraunces)] text-2xl">Outfits</h1>
          <p className="text-sm text-black/50">
            {carregando ? "Carregando…" : `${outfits.length} looks salvos`}
          </p>
        </div>
        <Link
          href="/outfits/novo"
          className="shrink-0 rounded-full border border-[var(--color-terracota)] px-3 py-1.5 text-sm text-[var(--color-terracota)]"
        >
          Novo look
        </Link>
      </header>

      {!carregando && outfits.length === 0 && (
        <p className="mt-16 text-center text-sm text-black/40">
          Nenhum look salvo ainda. Toque em &quot;Novo look&quot; pra criar o primeiro.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {outfits.map((o) => (
          <Link
            key={o.id}
            href={`/outfits/${o.id}`}
            className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/5">
              {o.itens.map((item) => {
                const peca = pecaPorId(item.pecaId);
                if (!peca?.fotoUrl) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.fotoSemFundoUrl ?? peca.fotoUrl}
                    alt=""
                    className="absolute"
                    style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.largura}%` }}
                  />
                );
              })}
              {o.itens.length === 0 && (
                <p className="flex h-full items-center justify-center text-xs text-black/30">Look vazio</p>
              )}
            </div>
            <p className="truncate px-3 py-2 text-sm font-medium">{o.nome}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
