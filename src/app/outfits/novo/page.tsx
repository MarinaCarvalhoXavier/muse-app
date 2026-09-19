"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Outfit, OutfitItem, Piece } from "@/lib/types";
import { generateId } from "@/lib/id";
import { addOutfit, getPieces } from "@/lib/storage";
import { OutfitCanvas } from "@/components/outfit-canvas";

export default function NovoOutfitPage() {
  const router = useRouter();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [itens, setItens] = useState<OutfitItem[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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

  async function handleSalvar() {
    if (itens.length === 0) {
      setErro("Adicione ao menos uma peça ao look.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const outfit: Outfit = {
      id: generateId(),
      nome: nome.trim() || "Look sem nome",
      itens,
      criadoEm: new Date().toISOString(),
    };
    const { error } = await addOutfit(outfit);
    setSalvando(false);
    if (error) {
      setErro(error);
      return;
    }
    router.push("/outfits");
  }

  return (
    <main className="px-4 pb-28 pt-8">
      <header className="mb-5 flex items-center gap-3">
        <Link
          href="/outfits"
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-black/50"
        >
          <i className="fi-rr-arrow-left" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wide text-black/40">Muse</p>
          <h1 className="font-[var(--font-display)] text-2xl">Novo look</h1>
        </div>
      </header>

      {carregando ? (
        <p className="text-sm text-black/40">Carregando…</p>
      ) : (
        <>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do look (ex: Reunião de terça)"
            className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
          />

          <OutfitCanvas pieces={pieces} itens={itens} onChange={setItens} />

          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="mt-6 w-full rounded-full bg-[var(--color-lime)] py-2.5 text-sm font-medium text-[var(--color-ink)] disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar look"}
          </button>
        </>
      )}
    </main>
  );
}
