"use client";

import { useEffect, useMemo, useState } from "react";
import { Piece } from "@/lib/types";
import { getPieces, updateFavorita } from "@/lib/storage";
import { PieceCard } from "@/components/piece-card";

const ORDEM_PADRAO = ["Parte de cima", "Parte de baixo", "Vestidos", "Macacões", "Sapatos", "Bolsas", "Acessórios"];

function ordenarTipos(tipos: string[]): string[] {
  const padrao = ORDEM_PADRAO.filter((t) => tipos.includes(t));
  const extras = tipos.filter((t) => !ORDEM_PADRAO.includes(t)).sort();
  return [...padrao, ...extras];
}

type FiltrosAvancados = {
  subtipos: string[];
  ocasioes: string[];
  cores: string[];
  pesos: string[];
};

const FILTROS_VAZIOS: FiltrosAvancados = { subtipos: [], ocasioes: [], cores: [], pesos: [] };

export default function ArmarioPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<string>("Todas");
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltrosAvancados>(FILTROS_VAZIOS);
  const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false);

  useEffect(() => {
    let ativo = true;
    getPieces().then((data) => {
      if (ativo) {
        setPieces(data);
        setCarregando(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  const tipos = useMemo(
    () => ordenarTipos(Array.from(new Set(pieces.map((p) => p.tipo)))),
    [pieces]
  );

  // Opções do filtro avançado vêm do que você realmente já cadastrou nas
  // peças — não faz sentido oferecer pra filtrar por algo que ninguém usou.
  const subtiposDisponiveis = useMemo(
    () => Array.from(new Set(pieces.flatMap((p) => p.subtipos ?? []))).sort(),
    [pieces]
  );
  const ocasioesDisponiveis = useMemo(
    () => Array.from(new Set(pieces.flatMap((p) => p.ocasioes))).sort(),
    [pieces]
  );
  const coresDisponiveis = useMemo(
    () => Array.from(new Set(pieces.map((p) => p.cor))),
    [pieces]
  );
  const pesosDisponiveis = useMemo(
    () => Array.from(new Set(pieces.map((p) => p.peso).filter((p): p is NonNullable<typeof p> => !!p))),
    [pieces]
  );

  async function handleToggleFavorita(piece: Piece) {
    const novoValor = !piece.favorita;
    setPieces((prev) =>
      prev.map((p) => (p.id === piece.id ? { ...p, favorita: novoValor } : p))
    );
    const { error } = await updateFavorita(piece.id, novoValor);
    if (error) {
      // reverte se der erro ao salvar
      setPieces((prev) =>
        prev.map((p) => (p.id === piece.id ? { ...p, favorita: piece.favorita } : p))
      );
    }
  }

  function toggleFiltroAvancado(categoria: keyof FiltrosAvancados, valor: string) {
    setFiltrosAvancados((prev) => {
      const atual = prev[categoria];
      const novo = atual.includes(valor) ? atual.filter((x) => x !== valor) : [...atual, valor];
      return { ...prev, [categoria]: novo };
    });
  }

  function limparFiltrosAvancados() {
    setFiltrosAvancados(FILTROS_VAZIOS);
  }

  function passaFiltrosAvancados(p: Piece): boolean {
    if (filtrosAvancados.subtipos.length > 0) {
      const subtiposPeca = p.subtipos ?? [];
      if (!subtiposPeca.some((s) => filtrosAvancados.subtipos.includes(s))) return false;
    }
    if (filtrosAvancados.ocasioes.length > 0) {
      if (!p.ocasioes.some((o) => filtrosAvancados.ocasioes.includes(o))) return false;
    }
    if (filtrosAvancados.cores.length > 0) {
      if (!filtrosAvancados.cores.includes(p.cor)) return false;
    }
    if (filtrosAvancados.pesos.length > 0) {
      if (!p.peso || !filtrosAvancados.pesos.includes(p.peso)) return false;
    }
    return true;
  }

  const totalFiltrosAtivos = Object.values(filtrosAvancados).reduce((acc, arr) => acc + arr.length, 0);
  const pecasComFiltroAvancado = pieces.filter(passaFiltrosAvancados);

  const filtros = ["Todas", "Curtidas", ...tipos];

  const piecesFiltradas =
    filtro === "Todas"
      ? null // null = usa o agrupamento por tipo (comportamento padrão)
      : filtro === "Curtidas"
      ? pecasComFiltroAvancado.filter((p) => p.favorita)
      : pecasComFiltroAvancado.filter((p) => p.tipo === filtro);

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-black/40">Muse</p>
        <h1 className="font-[var(--font-display)] text-2xl">Seu armário</h1>
        <p className="text-sm text-black/50">
          {carregando ? "Carregando…" : `${pieces.length} peças catalogadas`}
        </p>
      </header>

      {!carregando && pieces.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1">
            {filtros.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
                  filtro === f
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "border-black/10 text-black/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setModalFiltrosAberto(true)}
            aria-label="Filtros"
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
              totalFiltrosAtivos > 0
                ? "border-[var(--color-ink)] text-[var(--color-ink)]"
                : "border-black/10 text-black/50"
            }`}
          >
            <i className="fi-rr-settings-sliders text-sm" aria-hidden="true" />
            {totalFiltrosAtivos > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-ink)] text-[10px] text-white">
                {totalFiltrosAtivos}
              </span>
            )}
          </button>
        </div>
      )}

      {piecesFiltradas === null ? (
        <>
          {tipos.map((tipo) => {
            const items = pecasComFiltroAvancado.filter((p) => p.tipo === tipo);
            if (items.length === 0) return null;
            return (
              <section key={tipo} className="mb-8">
                <h2 className="mb-3 font-[var(--font-display)] text-lg">{tipo}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((piece) => (
                    <PieceCard key={piece.id} piece={piece} onToggleFavorita={handleToggleFavorita} />
                  ))}
                </div>
              </section>
            );
          })}
          {pecasComFiltroAvancado.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/40">Nenhuma peça com esses filtros.</p>
          )}
        </>
      ) : (
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3">
            {piecesFiltradas.map((piece) => (
              <PieceCard key={piece.id} piece={piece} onToggleFavorita={handleToggleFavorita} />
            ))}
          </div>
          {piecesFiltradas.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/40">Nenhuma peça aqui ainda.</p>
          )}
        </section>
      )}

      {!carregando && pieces.length === 0 && (
        <p className="mt-16 text-center text-sm text-black/40">
          Nenhuma peça ainda. Toque no + para adicionar a primeira.
        </p>
      )}

      {modalFiltrosAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-medium">Filtros</p>
              <button
                type="button"
                onClick={() => setModalFiltrosAberto(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-black/40"
              >
                <i className="fi-rr-cross-small" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              {subtiposDisponiveis.length > 0 && (
                <FiltroSecao
                  titulo="Subtipo"
                  opcoes={subtiposDisponiveis}
                  selecionadas={filtrosAvancados.subtipos}
                  onToggle={(v) => toggleFiltroAvancado("subtipos", v)}
                />
              )}
              {ocasioesDisponiveis.length > 0 && (
                <FiltroSecao
                  titulo="Ocasião"
                  opcoes={ocasioesDisponiveis}
                  selecionadas={filtrosAvancados.ocasioes}
                  onToggle={(v) => toggleFiltroAvancado("ocasioes", v)}
                />
              )}
              {pesosDisponiveis.length > 0 && (
                <FiltroSecao
                  titulo="Peso"
                  opcoes={pesosDisponiveis}
                  selecionadas={filtrosAvancados.pesos}
                  onToggle={(v) => toggleFiltroAvancado("pesos", v)}
                />
              )}
              {coresDisponiveis.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Cor</p>
                  <div className="flex flex-wrap gap-2">
                    {coresDisponiveis.map((c) => {
                      const ativa = filtrosAvancados.cores.includes(c);
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => toggleFiltroAvancado("cores", c)}
                          aria-label={c}
                          className={`h-9 w-9 rounded-full border-2 ${
                            ativa ? "border-[var(--color-ink)]" : "border-black/10"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={limparFiltrosAvancados}
                disabled={totalFiltrosAtivos === 0}
                className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-medium disabled:opacity-40"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setModalFiltrosAberto(false)}
                className="flex-1 rounded-full bg-[var(--color-lime)] py-2.5 text-sm font-medium text-[var(--color-ink)]"
              >
                Ver resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function FiltroSecao({
  titulo,
  opcoes,
  selecionadas,
  onToggle,
}: {
  titulo: string;
  opcoes: string[];
  selecionadas: string[];
  onToggle: (opcao: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const ativa = selecionadas.includes(opcao);
          return (
            <button
              type="button"
              key={opcao}
              onClick={() => onToggle(opcao)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                ativa
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)]/10 text-[var(--color-ink)]"
                  : "border-black/10 text-black/60"
              }`}
            >
              {opcao}
            </button>
          );
        })}
      </div>
    </div>
  );
}
