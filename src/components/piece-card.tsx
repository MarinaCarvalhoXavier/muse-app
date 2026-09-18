import Link from "next/link";
import { Piece } from "@/lib/types";

export function PieceCard({ piece }: { piece: Piece }) {
  return (
    <Link
      href={`/peca/${piece.id}`}
      className="relative block aspect-[3/4] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-transform active:scale-[0.98]"
    >
      {piece.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={piece.fotoUrl}
          alt={piece.tipo}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="h-full w-full" style={{ backgroundColor: piece.cor }} />
      )}
      <span
        className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 backdrop-blur ${
          piece.favorita ? "text-red-500" : "text-black/30"
        }`}
      >
        <i className={piece.favorita ? "fi-sr-heart" : "fi-rr-heart"} aria-hidden="true" />
      </span>
    </Link>
  );
}
