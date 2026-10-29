"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOutfits, getPieces } from "@/lib/storage";
import { Outfit, Piece } from "@/lib/types";

export default function PerfilPage() {
  const [pecas, setPecas] = useState<Piece[]>([]);
  const [looks, setLooks] = useState<Outfit[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([getPieces(), getOutfits()]).then(([p, o]) => {
      setPecas(p);
      setLooks(o);
      setCarregando(false);
    });
  }, []);

  // "Peças esquecidas": as que não aparecem em nenhum look salvo.
  // Ataca direto a dor da discovery de "não lembrar o que tem".
  const idsEmLooks = new Set(looks.flatMap((l) => l.itens.map((i) => i.pecaId)));
  const esquecidas = pecas.filter((p) => !idsEmLooks.has(p.id));
  const favoritas = pecas.filter((p) => p.favorita).length;

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-black/40">Muse</p>
        <h1 className="font-[var(--font-display)] text-2xl">Perfil</h1>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat valor={pecas.length} legenda="peças" carregando={carregando} />
        <Stat valor={looks.length} legenda="looks" carregando={carregando} />
        <Stat valor={favoritas} legenda="favoritas" carregando={carregando} />
      </div>

      <section>
        <h2 className="font-[var(--font-display)] text-xl">Peças esquecidas</h2>
        {carregando ? (
          <p className="mt-1 text-sm text-black/40">Carregando…</p>
        ) : esquecidas.length === 0 ? (
          <p className="mt-1 text-sm text-black/50">
            Todas as suas peças já estão em algum look. Arrasou!
          </p>
        ) : (
          <>
            <p className="mt-1 mb-4 text-sm text-black/50">
              {esquecidas.length === 1
                ? "1 peça ainda não entrou em nenhum look."
                : `${esquecidas.length} peças ainda não entraram em nenhum look.`}{" "}
              Que tal usar uma delas hoje?
            </p>
            <div className="grid grid-cols-3 gap-3">
              {esquecidas.map((p) => (
                <Link
                  key={p.id}
                  href={`/peca/${p.id}`}
                  aria-label={[p.tipo, ...(p.subtipos ?? [])].join(", ")}
                  className="block aspect-[3/4] overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm"
                >
                  {p.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.fotoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                  ) : (
                    <div className="h-full w-full" style={{ backgroundColor: p.cores?.[0] ?? "#e5e5e5" }} />
                  )}
                </Link>
              ))}
            </div>
            <Link
              href="/stylist"
              className="mt-5 block w-full rounded-full bg-[var(--color-lime)] py-2.5 text-center text-sm font-medium text-[var(--color-ink)]"
            >
              Pedir um look ao Stylist IA
            </Link>
          </>
        )}
      </section>

      <p className="mt-16 text-center text-[11px] text-black/30">
        Uicons by{" "}
        <a
          href="https://www.flaticon.com/uicons"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Flaticon
        </a>
      </p>
    </main>
  );
}

function Stat({ valor, legenda, carregando }: { valor: number; legenda: string; carregando: boolean }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4">
      <p className="text-2xl font-semibold">{carregando ? "–" : valor}</p>
      <p className="text-xs text-black/50">{legenda}</p>
    </div>
  );
}
