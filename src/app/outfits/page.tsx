"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Outfit, Piece, Uso } from "@/lib/types";
import { getOutfits, getPieces, getUsos, hojeLocal, registrarUso, removerUso } from "@/lib/storage";

// "hoje", "ontem", "há 5 dias" ou "12/10".
function quandoFoi(dia: string, hoje: string): string {
  const ms = new Date(`${hoje}T12:00:00`).getTime() - new Date(`${dia}T12:00:00`).getTime();
  const dias = Math.round(ms / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  const [, mm, dd] = dia.split("-");
  return `${dd}/${mm}`;
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [usos, setUsos] = useState<Uso[]>([]);
  const [tabelaUsosExiste, setTabelaUsosExiste] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeLocal();

  useEffect(() => {
    let ativo = true;
    Promise.all([getOutfits(), getPieces(), getUsos()]).then(([o, p, u]) => {
      if (!ativo) return;
      setOutfits(o);
      setPieces(p);
      setUsos(u.usos);
      setTabelaUsosExiste(u.tabelaExiste);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  function pecaPorId(id: string) {
    return pieces.find((p) => p.id === id);
  }

  async function alternarUsoHoje(outfitId: string) {
    setErro(null);
    setMarcandoId(outfitId);
    const jaUsou = usos.some((u) => u.outfitId === outfitId && u.usadoEm === hoje);
    if (jaUsou) {
      const { error } = await removerUso(outfitId, hoje);
      if (error) setErro("Não consegui desmarcar agora.");
      else setUsos((prev) => prev.filter((u) => !(u.outfitId === outfitId && u.usadoEm === hoje)));
    } else {
      const { uso, error } = await registrarUso(outfitId, hoje);
      if (error || !uso) setErro("Não consegui registrar o uso agora.");
      else setUsos((prev) => [uso, ...prev]);
    }
    setMarcandoId(null);
  }

  return (
    <main className="px-4 pb-40 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-black/40">Muse</p>
        <h1 className="font-[var(--font-display)] text-2xl">Looks</h1>
        <p className="text-sm text-black/50">
          {carregando ? "Carregando…" : outfits.length === 1 ? "1 look salvo" : `${outfits.length} looks salvos`}
        </p>
      </header>

      {!tabelaUsosExiste && !carregando && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          O &quot;Usei hoje&quot; ainda não está ativo: falta rodar o arquivo supabase/migration-usos.sql no Supabase.
        </p>
      )}
      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {!carregando && outfits.length === 0 && (
        <p className="mt-16 text-center text-sm text-black/40">
          Nenhum look salvo ainda. Toque em &quot;Criar look&quot; aqui embaixo pra montar o primeiro.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {outfits.map((o) => {
          const usosDoLook = usos.filter((u) => u.outfitId === o.id);
          const usouHoje = usosDoLook.some((u) => u.usadoEm === hoje);
          const ultimo = usosDoLook[0]?.usadoEm;
          return (
            <div key={o.id} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <Link href={`/outfits/${o.id}`} className="block transition-transform active:scale-[0.98]">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/5">
                  {o.itens.map((item) => {
                    const peca = pecaPorId(item.pecaId);
                    if (!peca?.fotoUrl) return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={item.id}
                        src={item.fotoSemFundoUrl ?? peca.fotoUrl}
                        alt=""
                        className="absolute"
                        style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.largura}%` }}
                      />
                    );
                  })}
                  {o.itens.length === 0 && (
                    <p className="flex h-full items-center justify-center text-xs text-black/30">Look vazio</p>
                  )}
                </div>
                <p className="truncate px-3 pt-2 text-sm font-medium">{o.nome}</p>
                <p className="px-3 text-[11px] text-black/45">
                  {usosDoLook.length === 0
                    ? "Ainda não usado"
                    : `Usado ${usosDoLook.length}x · ${quandoFoi(ultimo, hoje)}`}
                </p>
              </Link>
              {tabelaUsosExiste && (
                <div className="px-3 pb-3 pt-2">
                  <button
                    type="button"
                    onClick={() => alternarUsoHoje(o.id)}
                    disabled={marcandoId === o.id}
                    aria-pressed={usouHoje}
                    className={`w-full rounded-full py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                      usouHoje
                        ? "bg-[var(--color-ink)] text-white"
                        : "border border-black/15 text-black/70"
                    }`}
                  >
                    {usouHoje ? "✓ Usado hoje" : "Usei hoje"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão fixo, sempre à mão, acima da barra de navegação */}
      <div className="pointer-events-none fixed bottom-[104px] left-0 right-0 z-30 mx-auto flex max-w-md justify-center px-4">
        <Link
          href="/outfits/novo"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/25 transition-transform active:scale-95"
        >
          <i className="fi-rr-plus text-sm" aria-hidden="true" /> Criar look
        </Link>
      </div>
    </main>
  );
}
