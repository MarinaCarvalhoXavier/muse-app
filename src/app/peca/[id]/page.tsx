"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Piece } from "@/lib/types";
import { getPieceById } from "@/lib/storage";

export default function DetalhePecaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [piece, setPiece] = useState<Piece | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    getPieceById(params.id).then((data) => {
      if (ativo) setPiece(data);
    });
    return () => {
      ativo = false;
    };
  }, [params.id]);

  return (
    <main className="px-4 pb-24 pt-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-black/50"
      >
        <i className="fi-rr-arrow-left" aria-hidden="true" /> Voltar
      </button>

      {piece === undefined && <p className="text-sm text-black/40">Carregando…</p>}

      {piece === null && <p className="text-sm text-black/40">Peça não encontrada.</p>}

      {piece && (
        <>
          <div
            className="relative mb-6 aspect-[3/4] w-full overflow-hidden rounded-2xl"
            style={{ backgroundColor: piece.fotoUrl ? "#fff" : piece.cor }}
          >
            {piece.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={piece.fotoUrl}
                alt={piece.tipo}
                className="h-full w-full object-contain"
              />
            ) : null}
            {piece.favorita && (
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-red-500">
                <i className="fi-sr-heart" aria-hidden="true" />
              </span>
            )}
          </div>

          <h1 className="mb-1 font-[var(--font-fraunces)] text-2xl">{piece.tipo}</h1>
          <p className="mb-6 text-sm text-black/50">
            Adicionada em {new Date(piece.criadaEm).toLocaleDateString("pt-BR")}
          </p>

          <div className="space-y-4">
            <DetalheItem label="Ocasião" valor={piece.ocasioes.join(", ") || "Nenhuma"} />
            <DetalheItem label="Estação" valor={piece.estacoes.join(", ") || "Nenhuma"} />
            <DetalheItem label="Cor" valor={piece.cor} />
            {piece.marca && <DetalheItem label="Marca" valor={piece.marca} />}
            {piece.estampa && <DetalheItem label="Estampa" valor={piece.estampa} />}
            {piece.notas && <DetalheItem label="Notas" valor={piece.notas} />}
          </div>
        </>
      )}
    </main>
  );
}

function DetalheItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="border-b border-black/5 pb-3">
      <p className="text-xs uppercase tracking-wide text-black/40">{label}</p>
      <p className="text-sm">{valor}</p>
    </div>
  );
}
