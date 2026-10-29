"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Outfit, OutfitItem, Piece } from "@/lib/types";
import { generateId } from "@/lib/id";
import { addOutfit, getPieces } from "@/lib/storage";
import { LookEditor } from "@/components/look-editor";

export default function NovoOutfitPage() {
  const router = useRouter();
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    let ativo = true;
    getPieces().then((data) => {
      if (ativo) setPieces(data);
    });
    return () => {
      ativo = false;
    };
  }, []);

  async function salvar(nome: string, itens: OutfitItem[]): Promise<string | null> {
    const outfit: Outfit = { id: generateId(), nome, itens, criadoEm: new Date().toISOString() };
    const { error } = await addOutfit(outfit);
    if (error) return error;
    router.push("/outfits");
    return null;
  }

  if (!pieces) {
    return <p className="px-4 pt-8 text-sm text-black/40">Carregando…</p>;
  }

  return (
    <LookEditor
      titulo="Novo look"
      pieces={pieces}
      itensIniciais={[]}
      nomeInicial=""
      onSalvar={salvar}
      onFechar={() => router.push("/outfits")}
    />
  );
}
