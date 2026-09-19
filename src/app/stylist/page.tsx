"use client";

import { useEffect, useState } from "react";
import { Ocasiao, Outfit, OutfitItem, Peso, Piece } from "@/lib/types";
import { generateId } from "@/lib/id";
import { addOutfit, getCustomOcasioes, getPieces } from "@/lib/storage";

const OCASIOES_PADRAO: Ocasiao[] = ["Casual", "Trabalho", "Festa chique", "Balada eletrônica"];
const PESOS: Peso[] = ["Leve", "Neutra", "Quente"];

type Sugestao = {
  localId: string;
  pecaIds: string[];
  observacao: string;
};

function pecaResumo(p: Piece) {
  return {
    id: p.id,
    tipo: p.tipo,
    subtipos: p.subtipos ?? [],
    ocasioes: p.ocasioes,
    cores: p.cores ?? [],
    peso: p.peso,
    marca: p.marca,
    estampa: p.estampa,
    favorita: p.favorita,
  };
}

// Distribui as peças de um look num grid simples de até 2 colunas dentro do
// canvas do outfit — só um ponto de partida; a pessoa pode reorganizar depois
// abrindo o look na tela de edição.
function distribuirEmGrade(pecaIds: string[]): OutfitItem[] {
  const colunas = pecaIds.length > 1 ? 2 : 1;
  const largura = 38;
  const xPorColuna = colunas === 2 ? [5, 57] : [31];
  return pecaIds.map((pecaId, i) => {
    const col = i % colunas;
    const linha = Math.floor(i / colunas);
    return {
      id: generateId(),
      pecaId,
      x: xPorColuna[col],
      y: Math.min(5 + linha * 40, 80),
      largura,
    };
  });
}

export default function StylistPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [ocasioesOpcoes] = useState<Ocasiao[]>(() => [...OCASIOES_PADRAO, ...getCustomOcasioes()]);
  const [ocasiaoSelecionada, setOcasiaoSelecionada] = useState<Ocasiao | null>(null);
  const [pesoSelecionado, setPesoSelecionado] = useState<Peso | null>(null);
  const [pedidoLivre, setPedidoLivre] = useState("");

  const [trocandoChave, setTrocandoChave] = useState<string | null>(null);
  const [salvandoLocalId, setSalvandoLocalId] = useState<string | null>(null);
  const [salvosLocalIds, setSalvosLocalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ativo = true;
    getPieces().then((data) => {
      if (!ativo) return;
      setPieces(data);
      setCarregando(false);
      buscarSugestoes(data, {});
    });
    return () => {
      ativo = false;
    };
  }, []);

  function pecaPorId(id: string) {
    return pieces.find((p) => p.id === id);
  }

  async function buscarSugestoes(
    pecasDisponiveis: Piece[],
    filtros: { ocasiao?: Ocasiao | null; peso?: Peso | null; pedidoLivre?: string },
    opts?: { prepend?: boolean; quantidade?: number }
  ) {
    const comFoto = pecasDisponiveis.filter((p) => p.fotoUrl);
    if (comFoto.length === 0) {
      setErro("Cadastre peças com foto no armário pra eu poder sugerir looks.");
      return;
    }
    setCarregandoSugestoes(true);
    setErro(null);
    try {
      const res = await fetch("/api/sugerir-outfit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modo: "sugestoes",
          pecas: comFoto.map(pecaResumo),
          ocasiao: filtros.ocasiao ?? undefined,
          peso: filtros.peso ?? undefined,
          pedidoLivre: filtros.pedidoLivre ?? undefined,
          quantidade: opts?.quantidade ?? 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não consegui gerar sugestões agora.");
        return;
      }
      const novas: Sugestao[] = (data.sugestoes ?? []).map((s: { pecaIds: string[]; observacao: string }) => ({
        localId: generateId(),
        pecaIds: s.pecaIds,
        observacao: s.observacao,
      }));
      if (novas.length === 0) {
        setErro("Não encontrei uma combinação boa com esses critérios. Tenta ajustar o pedido.");
      }
      setSugestoes((prev) => (opts?.prepend ? [...novas, ...prev] : novas));
    } catch (err) {
      console.error(err);
      setErro("Não consegui gerar sugestões agora.");
    } finally {
      setCarregandoSugestoes(false);
    }
  }

  function handlePedirSugestao() {
    buscarSugestoes(
      pieces,
      { ocasiao: ocasiaoSelecionada, peso: pesoSelecionado, pedidoLivre },
      { prepend: true, quantidade: 2 }
    );
  }

  async function handleTrocarPeca(sugestao: Sugestao, pecaId: string) {
    const chave = `${sugestao.localId}:${pecaId}`;
    setTrocandoChave(chave);
    try {
      const comFoto = pieces.filter((p) => p.fotoUrl);
      const res = await fetch("/api/sugerir-outfit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modo: "trocar",
          pecas: comFoto.map(pecaResumo),
          pecaIdsAtuais: sugestao.pecaIds,
          pecaIdParaTrocar: pecaId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.pecaId) {
        setErro("Não achei uma troca melhor pra essa peça agora.");
        return;
      }
      setSugestoes((prev) =>
        prev.map((s) =>
          s.localId === sugestao.localId
            ? { ...s, pecaIds: s.pecaIds.map((id) => (id === pecaId ? data.pecaId : id)) }
            : s
        )
      );
    } catch (err) {
      console.error(err);
      setErro("Não achei uma troca melhor pra essa peça agora.");
    } finally {
      setTrocandoChave(null);
    }
  }

  async function handleSalvarComoOutfit(sugestao: Sugestao) {
    setSalvandoLocalId(sugestao.localId);
    setErro(null);
    const outfit: Outfit = {
      id: generateId(),
      nome: sugestao.observacao || "Sugestão da Stylist IA",
      itens: distribuirEmGrade(sugestao.pecaIds),
      criadoEm: new Date().toISOString(),
    };
    const { error } = await addOutfit(outfit);
    setSalvandoLocalId(null);
    if (error) {
      setErro(error);
      return;
    }
    setSalvosLocalIds((prev) => new Set(prev).add(sugestao.localId));
  }

  return (
    <main className="px-4 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-black/40">Muse</p>
        <h1 className="font-[var(--font-display)] text-2xl">Stylist IA</h1>
        <p className="text-sm text-black/50">Combinações com o que você já tem no armário</p>
      </header>

      <div className="mb-6 rounded-2xl border border-black/10 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-black/40">Pedir um look</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {ocasioesOpcoes.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOcasiaoSelecionada((prev) => (prev === o ? null : o))}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                ocasiaoSelecionada === o
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                  : "border-black/15 text-black/70"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {PESOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPesoSelecionado((prev) => (prev === p ? null : p))}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                pesoSelecionado === p
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                  : "border-black/15 text-black/70"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={pedidoLivre}
          onChange={(e) => setPedidoLivre(e.target.value)}
          placeholder="Algo mais? Ex: reunião importante hoje à tarde"
          className="mb-3 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handlePedirSugestao}
          disabled={carregandoSugestoes}
          className="w-full rounded-full bg-[var(--color-lime)] py-2.5 text-sm font-medium text-[var(--color-ink)] disabled:opacity-60"
        >
          {carregandoSugestoes ? "Pensando…" : "Pedir sugestão"}
        </button>
      </div>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-black/40">Carregando armário…</p>
      ) : carregandoSugestoes && sugestoes.length === 0 ? (
        <p className="text-sm text-black/40">Montando as primeiras sugestões…</p>
      ) : (
        <div className="space-y-5">
          {sugestoes.map((sugestao) => (
            <div key={sugestao.localId} className="rounded-2xl border border-black/10 p-4">
              {sugestao.observacao && <p className="mb-3 text-sm text-black/70">{sugestao.observacao}</p>}
              <div className="mb-3 flex flex-wrap gap-3">
                {sugestao.pecaIds.map((pecaId) => {
                  const peca = pecaPorId(pecaId);
                  const chave = `${sugestao.localId}:${pecaId}`;
                  if (!peca) return null;
                  return (
                    <div key={pecaId} className="w-24">
                      <div className="mb-1.5 aspect-[3/4] overflow-hidden rounded-xl border border-black/5 bg-white">
                        {peca.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={peca.fotoUrl} alt={peca.tipo} className="h-full w-full object-contain" />
                        ) : (
                          <div className="h-full w-full" style={{ backgroundColor: peca.cores?.[0] ?? "#e5e5e5" }} />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTrocarPeca(sugestao, pecaId)}
                        disabled={trocandoChave === chave}
                        className="w-full rounded-full border border-black/15 py-1 text-xs font-medium text-black/60 disabled:opacity-60"
                      >
                        {trocandoChave === chave ? "Trocando…" : "Trocar"}
                      </button>
                    </div>
                  );
                })}
              </div>
              {salvosLocalIds.has(sugestao.localId) ? (
                <p className="text-center text-sm font-medium text-black/50">Salvo em Outfits ✓</p>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSalvarComoOutfit(sugestao)}
                  disabled={salvandoLocalId === sugestao.localId}
                  className="w-full rounded-full border border-[var(--color-ink)] py-2 text-sm font-medium text-[var(--color-ink)] disabled:opacity-60"
                >
                  {salvandoLocalId === sugestao.localId ? "Salvando…" : "Salvar como outfit"}
                </button>
              )}
            </div>
          ))}
          {!carregandoSugestoes && sugestoes.length === 0 && !erro && (
            <p className="mt-10 text-center text-sm text-black/40">
              Nenhuma sugestão ainda. Peça um look aí em cima.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
