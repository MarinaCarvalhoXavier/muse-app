"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Piece } from "@/lib/types";
import { deletePiece, getPieceById, updateFavorita } from "@/lib/storage";

export default function DetalhePecaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [piece, setPiece] = useState<Piece | null | undefined>(undefined);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  useEffect(() => {
    let ativo = true;
    getPieceById(params.id).then((data) => {
      if (ativo) setPiece(data);
    });
    return () => {
      ativo = false;
    };
  }, [params.id]);

  async function handleToggleFavorita() {
    if (!piece) return;
    const novoValor = !piece.favorita;
    setPiece({ ...piece, favorita: novoValor });
    const { error } = await updateFavorita(piece.id, novoValor);
    if (error) {
      setPiece((atual) => (atual ? { ...atual, favorita: !novoValor } : atual));
    }
  }

  async function handleExcluir() {
    if (!piece) return;
    setExcluindo(true);
    setErro(null);
    const { error } = await deletePiece(piece.id);
    if (error) {
      setErro(error);
      setExcluindo(false);
      return;
    }
    router.push("/");
  }

  return (
    <main className="px-4 pb-24 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-black/50"
        >
          <i className="fi-rr-arrow-left" aria-hidden="true" /> Voltar
        </button>

        {piece && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/adicionar?editar=${piece.id}`)}
              className="flex items-center gap-1 text-sm text-black/70"
            >
              <i className="fi-rr-pencil" aria-hidden="true" /> Editar
            </button>
            <button
              onClick={() => setConfirmandoExclusao(true)}
              className="flex items-center gap-1 text-sm text-red-600"
            >
              <i className="fi-rr-trash" aria-hidden="true" /> Excluir
            </button>
          </div>
        )}
      </div>

      {piece === undefined && <p className="text-sm text-black/40">Carregando…</p>}

      {piece === null && <p className="text-sm text-black/40">Peça não encontrada.</p>}

      {piece && (
        <>
          <div
            className="relative mb-6 aspect-[3/4] w-full overflow-hidden rounded-2xl"
            style={{ backgroundColor: piece.fotoUrl ? "#fff" : piece.cores?.[0] ?? "#e5e5e5" }}
          >
            {piece.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={piece.fotoUrl}
                alt={piece.tipo}
                className="h-full w-full object-contain"
              />
            ) : null}
            <button
              type="button"
              onClick={handleToggleFavorita}
              aria-label={piece.favorita ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 ${
                piece.favorita ? "text-red-500" : "text-black/30"
              }`}
            >
              <i className={piece.favorita ? "fi-sr-heart" : "fi-rr-heart"} aria-hidden="true" />
            </button>
          </div>

          <h1 className="mb-1 font-[var(--font-display)] text-2xl">
            {piece.tipo}
            {piece.subtipos && piece.subtipos.length > 0 && (
              <span className="text-black/40"> · {piece.subtipos.join(", ")}</span>
            )}
          </h1>
          <p className="mb-6 text-sm text-black/50">
            Adicionada em {new Date(piece.criadaEm).toLocaleDateString("pt-BR")}
          </p>

          <div className="space-y-4">
            <DetalheItem label="Ocasião" valor={piece.ocasioes.join(", ") || "Nenhuma"} />
            <DetalheItem label="Peso" valor={piece.peso || "Não definido"} />
            <div className="border-b border-black/5 pb-3">
              <p className="text-xs uppercase tracking-wide text-black/40">Cor</p>
              {piece.cores && piece.cores.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {piece.cores.map((c) => (
                    <span
                      key={c}
                      className="h-5 w-5 rounded-full border border-black/15"
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm">Nenhuma</p>
              )}
            </div>
            {piece.marca && <DetalheItem label="Marca" valor={piece.marca} />}
            {piece.estampa && <DetalheItem label="Estampa" valor={piece.estampa} />}
            {piece.notas && <DetalheItem label="Notas" valor={piece.notas} />}
          </div>
        </>
      )}

      {confirmandoExclusao && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="mb-1 font-medium">Excluir esta peça?</p>
            <p className="mb-4 text-sm text-black/50">
              Essa ação não pode ser desfeita.
            </p>
            {erro && <p className="mb-3 text-sm text-red-600">Erro: {erro}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                disabled={excluindo}
                className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-medium disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluir}
                disabled={excluindo}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
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
