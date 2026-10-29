"use client";

import { Piece } from "@/lib/types";

// Ordem preferida dos filtros; tipos criados pela pessoa entram depois, em ordem alfabética.
const ORDEM_TIPOS = ["Parte de cima", "Parte de baixo", "Vestidos", "Macacões", "Casaco", "Sapatos", "Bolsas", "Acessórios"];
export const TODAS = "Todas";

export function tiposDasPecas(pecas: Piece[]): string[] {
  return Array.from(new Set(pecas.map((p) => p.tipo))).sort((a, b) => {
    const ia = ORDEM_TIPOS.indexOf(a);
    const ib = ORDEM_TIPOS.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b, "pt-BR");
  });
}

export function filtrarPorTipo(pecas: Piece[], tipo: string): Piece[] {
  return tipo === TODAS ? pecas : pecas.filter((p) => p.tipo === tipo);
}

// Fileira de chips "Todas · Parte de cima 3 · Sapatos 2…" usada no Novo look e no Perfil.
export function FiltroTipos({
  pecas,
  selecionado,
  onSelecionar,
  className = "",
}: {
  pecas: Piece[];
  selecionado: string;
  onSelecionar: (tipo: string) => void;
  className?: string;
}) {
  const tipos = tiposDasPecas(pecas);
  if (tipos.length <= 1) return null;
  return (
    <div className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 ${className}`}>
      {[TODAS, ...tipos].map((t) => {
        const quantidade = filtrarPorTipo(pecas, t).length;
        const ativo = selecionado === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelecionar(t)}
            aria-pressed={ativo}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              ativo ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white" : "border-black/15 text-black/70"
            }`}
          >
            {t} <span className={ativo ? "text-white/60" : "text-black/35"}>{quantidade}</span>
          </button>
        );
      })}
    </div>
  );
}
