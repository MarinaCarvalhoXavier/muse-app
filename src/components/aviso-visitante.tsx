"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessao } from "@/lib/sessao";

// Faixa no topo pra quem abre o link sem login.
export function AvisoVisitante() {
  const { carregando, dona } = useSessao();
  const caminho = usePathname();
  if (carregando || dona || caminho === "/entrar") return null;
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-[var(--color-ink)] px-4 py-2 text-xs text-white">
      <span>
        <strong className="font-semibold">Modo demonstração</strong> · o armário real da Marina, só pra explorar
      </span>
      <Link href="/entrar" className="shrink-0 underline underline-offset-2 opacity-80">
        Entrar
      </Link>
    </div>
  );
}
