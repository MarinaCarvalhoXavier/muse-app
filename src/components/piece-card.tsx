"use client";

import { useRef } from "react";
import Link from "next/link";
import { Piece } from "@/lib/types";

export function PieceCard({
  piece,
  onToggleFavorita,
  onSegurar,
}: {
  piece: Piece;
  onToggleFavorita?: (piece: Piece) => void;
  // Chamado ao segurar o dedo na peça (ou clique direito no computador).
  onSegurar?: (piece: Piece) => void;
}) {
  const pressionando = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const abriuPorPressao = useRef(false);

  function cancelar() {
    if (pressionando.current) clearTimeout(pressionando.current.timer);
    pressionando.current = null;
  }

  return (
    <Link
      href={`/peca/${piece.id}`}
      draggable={false}
      onPointerDown={(e) => {
        if (!onSegurar) return;
        abriuPorPressao.current = false;
        const timer = setTimeout(() => {
          abriuPorPressao.current = true;
          pressionando.current = null;
          onSegurar(piece);
        }, 450);
        pressionando.current = { timer, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const p = pressionando.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelar();
      }}
      onPointerUp={cancelar}
      onPointerLeave={cancelar}
      onPointerCancel={cancelar}
      onContextMenu={(e) => {
        if (!onSegurar) return;
        e.preventDefault();
        cancelar();
        onSegurar(piece);
      }}
      onClick={(e) => {
        // Se o menu abriu por pressão, o toque não deve abrir a peça.
        if (abriuPorPressao.current) {
          e.preventDefault();
          abriuPorPressao.current = false;
        }
      }}
      className="relative block aspect-[3/4] select-none overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-transform active:scale-[0.98] [-webkit-touch-callout:none]"
    >
      {piece.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={piece.fotoUrl}
          alt={piece.tipo}
          draggable={false}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="h-full w-full" style={{ backgroundColor: piece.cores?.[0] ?? "#e5e5e5" }} />
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorita?.(piece);
        }}
        aria-label={piece.favorita ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 backdrop-blur transition-transform active:scale-90 ${
          piece.favorita ? "text-red-500" : "text-black/30"
        }`}
      >
        <i className={piece.favorita ? "fi-sr-heart" : "fi-rr-heart"} aria-hidden="true" />
      </button>
    </Link>
  );
}
