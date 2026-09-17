import { Piece } from "@/lib/types";

export function PieceCard({ piece }: { piece: Piece }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div
        className="relative flex h-28 items-center justify-center"
        style={{ backgroundColor: piece.cor }}
      >
        {piece.favorita && (
          <span className="absolute left-2 top-2 text-sm text-white/90">★</span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-sm font-medium">{piece.tipo}</p>
        <p className="truncate text-[11px] text-black/50">
          {piece.ocasioes.join(", ") || "Sem ocasião"}
        </p>
      </div>
    </div>
  );
}
