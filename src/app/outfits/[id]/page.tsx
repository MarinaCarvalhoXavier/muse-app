"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Outfit, OutfitItem, Piece } from "@/lib/types";
import { deleteOutfit, getOutfitById, getPieces, updateOutfit } from "@/lib/storage";
import { OutfitCanvas } from "@/components/outfit-canvas";

export default function OutfitDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [itens, setItens] = useState<OutfitItem[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([getOutfitById(params.id), getPieces()]).then(([o, p]) => {
      if (!ativo) return;
      setOutfit(o);
      setPieces(p);
      if (o) {
        setNome(o.nome);
        setItens(o.itens);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [params.id]);

  async function handleSalvar() {
    setSalvando(true);
    setErro(null);
    const { error } = await updateOutfit(params.id, { nome: nome.trim() || "Look sem nome", itens });
    setSalvando(false);
    if (error) {
      setErro(error);
      return;
    }
    router.push("/outfits");
  }

  async function handleExcluir() {
    if (!confirm("Excluir este look?")) return;
    await deleteOutfit(params.id);
    router.push("/outfits");
  }

  if (carregando) {
    return (
      <main className="px-4 pb-24 pt-8">
        <p className="text-sm text-black/40">Carregando…</p>
      </main>
    );
  }

  if (!outfit) {
    return (
      <main className="px-4 pb-24 pt-8">
        <p className="text-sm text-black/40">Look não encontrado.</p>
        <Link href="/outfits" className="mt-4 inline-block text-sm text-[var(--color-terracota)]">
          Voltar
        </Link>
      </main>
    );
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
          <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Muse</p>
          <h1 className="font-[var(--font-fraunces)] text-2xl">Editar look</h1>
        </div>
      </header>

      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do look"
        className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
      />

      <OutfitCanvas pieces={pieces} itens={itens} onChange={setItens} />

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={handleExcluir}
          className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500"
        >
          Excluir
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="flex-1 rounded-full bg-[var(--color-terracota)] py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </main>
  );
}
