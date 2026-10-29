"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Outfit, OutfitItem, Piece } from "@/lib/types";
import { deleteOutfit, getOutfitById, getPieces, updateOutfit } from "@/lib/storage";
import { LookEditor } from "@/components/look-editor";

export default function OutfitDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([getOutfitById(params.id), getPieces()]).then(([o, p]) => {
      if (!ativo) return;
      setOutfit(o);
      setPieces(p);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [params.id]);

  async function salvar(nome: string, itens: OutfitItem[]): Promise<string | null> {
    const { error } = await updateOutfit(params.id, { nome, itens });
    if (error) return error;
    router.push("/outfits");
    return null;
  }

  async function excluir() {
    await deleteOutfit(params.id);
    router.push("/outfits");
  }

  if (carregando) {
    return <p className="px-4 pt-8 text-sm text-black/40">Carregando…</p>;
  }

  if (!outfit) {
    return (
      <main className="px-4 pb-24 pt-8">
        <p className="text-sm text-black/40">Look não encontrado.</p>
        <Link href="/outfits" className="mt-4 inline-block text-sm text-black underline">
          Voltar
        </Link>
      </main>
    );
  }

  return (
    <LookEditor
      titulo="Editar look"
      pieces={pieces}
      itensIniciais={outfit.itens}
      nomeInicial={outfit.nome}
      onSalvar={salvar}
      onFechar={() => router.push("/outfits")}
      onExcluir={excluir}
    />
  );
}
