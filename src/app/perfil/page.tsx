"use client";

import { useEffect, useState } from "react";
import { getOutfits, getPieces } from "@/lib/storage";

export default function PerfilPage() {
  const [totalPecas, setTotalPecas] = useState(0);
  const [totalOutfits, setTotalOutfits] = useState(0);

  useEffect(() => {
    setTotalPecas(getPieces().length);
    setTotalOutfits(getOutfits().length);
  }, []);

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Muse</p>
        <h1 className="font-[var(--font-fraunces)] text-2xl">Perfil</h1>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/5 bg-white p-4">
          <p className="text-2xl font-semibold">{totalPecas}</p>
          <p className="text-xs text-black/50">peças no armário</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4">
          <p className="text-2xl font-semibold">{totalOutfits}</p>
          <p className="text-xs text-black/50">looks salvos</p>
        </div>
      </div>

      <p className="text-sm text-black/40">
        Esta tela ainda é a menos definida do projeto — configurações e o
        destaque de peças esquecidas entram nas próximas versões.
      </p>
    </main>
  );
}
