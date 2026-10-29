"use client";

import { useEffect, useRef, useState } from "react";
import { OutfitItem, Piece } from "@/lib/types";
import { generateId } from "@/lib/id";
import { nomeDoRecorte } from "@/lib/recorte";
import { FiltroTipos, TODAS, filtrarPorTipo } from "@/components/filtro-tipos";

const LARGURA_PADRAO = 38; // % da largura do canvas


export function OutfitCanvas({
  pieces,
  itens,
  onChange,
}: {
  pieces: Piece[];
  itens: OutfitItem[];
  onChange: (itens: OutfitItem[]) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<{ pecaId: string; x: number; y: number } | null>(null);
  const [removendoFundoId, setRemovendoFundoId] = useState<string | null>(null);
  const [erroRemoverFundo, setErroRemoverFundo] = useState<string | null>(null);
  const [falhouRecorte, setFalhouRecorte] = useState<Set<string>>(new Set());

  // Sempre a lista mais recente de itens, pra atualizar um item depois de uma
  // chamada demorada sem desfazer mudanças feitas nesse meio-tempo.
  const itensRef = useRef(itens);
  useEffect(() => {
    itensRef.current = itens;
  }, [itens]);
  const emAndamento = useRef<Set<string>>(new Set());

  const pecasNoCanvas = new Set(itens.map((i) => i.pecaId));
  const pecasDisponiveis = pieces.filter((p) => p.fotoUrl);

  // Filtro por tipo na tira de peças: com o armário crescendo, achar uma bolsa
  // no meio de todas as fotos misturadas fica difícil.
  const [tipoFiltro, setTipoFiltro] = useState<string>(TODAS);
  const pecasFiltradas = filtrarPorTipo(pecasDisponiveis, tipoFiltro);

  function getCanvasRect() {
    return canvasRef.current?.getBoundingClientRect() ?? null;
  }

  function onChangeItem(id: string, patch: Partial<OutfitItem>) {
    onChange(itensRef.current.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  // Arrastar uma peça da tira de baixo pra dentro do canvas.
  function iniciarArrastoDaTira(e: React.PointerEvent, peca: Piece) {
    e.preventDefault();
    setSelecionadoId(null);
    setArrastando({ pecaId: peca.id, x: e.clientX, y: e.clientY });

    function mover(ev: PointerEvent) {
      setArrastando((prev) => (prev ? { ...prev, x: ev.clientX, y: ev.clientY } : prev));
    }
    function soltar(ev: PointerEvent) {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      const rect = getCanvasRect();
      setArrastando(null);
      if (!rect) return;
      const dentro =
        ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      if (!dentro) return;
      const xPct = ((ev.clientX - rect.left) / rect.width) * 100;
      const yPct = ((ev.clientY - rect.top) / rect.height) * 100;
      const novoItem: OutfitItem = {
        id: generateId(),
        pecaId: peca.id,
        x: Math.min(Math.max(xPct - LARGURA_PADRAO / 2, 0), 100 - LARGURA_PADRAO),
        y: Math.min(Math.max(yPct - LARGURA_PADRAO / 2, 0), 85),
        largura: LARGURA_PADRAO,
      };
      onChange([...itens, novoItem]);
      setSelecionadoId(novoItem.id);
    }
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  // Mover uma peça que já está no canvas.
  function iniciarMovimento(e: React.PointerEvent, item: OutfitItem) {
    e.preventDefault();
    e.stopPropagation();
    setSelecionadoId(item.id);
    const rect = getCanvasRect();
    if (!rect) return;
    const rectAtual = rect;
    const inicioX = e.clientX;
    const inicioY = e.clientY;
    const xOriginal = item.x;
    const yOriginal = item.y;

    function mover(ev: PointerEvent) {
      const dxPct = ((ev.clientX - inicioX) / rectAtual.width) * 100;
      const dyPct = ((ev.clientY - inicioY) / rectAtual.height) * 100;
      onChangeItem(item.id, {
        x: Math.min(Math.max(xOriginal + dxPct, -10), 95),
        y: Math.min(Math.max(yOriginal + dyPct, -10), 95),
      });
    }
    function soltar() {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    }
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  // Redimensionar a peça selecionada, puxando a alcinha no canto.
  function iniciarRedimensionamento(e: React.PointerEvent, item: OutfitItem) {
    e.preventDefault();
    e.stopPropagation();
    const rect = getCanvasRect();
    if (!rect) return;
    const rectAtual = rect;
    const inicioX = e.clientX;
    const larguraOriginal = item.largura;

    function mover(ev: PointerEvent) {
      const dxPct = ((ev.clientX - inicioX) / rectAtual.width) * 100;
      const novaLargura = Math.min(Math.max(larguraOriginal + dxPct, 12), 90);
      onChangeItem(item.id, { largura: novaLargura });
    }
    function soltar() {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    }
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  function trazerParaFrente(id: string) {
    const item = itens.find((i) => i.id === id);
    if (!item) return;
    onChange([...itens.filter((i) => i.id !== id), item]);
  }

  function enviarParaTras(id: string) {
    const item = itens.find((i) => i.id === id);
    if (!item) return;
    onChange([item, ...itens.filter((i) => i.id !== id)]);
  }

  function remover(id: string) {
    onChange(itens.filter((i) => i.id !== id));
    setSelecionadoId(null);
  }

  // O item ainda não tem o recorte certo da foto atual da peça?
  function precisaRecorte(item: OutfitItem): boolean {
    const peca = pieces.find((p) => p.id === item.pecaId);
    if (!peca?.fotoUrl) return false;
    return !item.fotoSemFundoUrl?.includes(nomeDoRecorte(peca.fotoUrl));
  }

  async function removerFundoDoItem(item: OutfitItem) {
    const peca = pieces.find((p) => p.id === item.pecaId);
    if (!peca?.fotoUrl || emAndamento.current.has(item.id)) return;
    emAndamento.current.add(item.id);
    setRemovendoFundoId(item.id);
    setErroRemoverFundo(null);
    try {
      const res = await fetch("/api/remover-fundo-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoUrl: peca.fotoUrl }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok || !dados?.url) {
        setFalhouRecorte((prev) => new Set(prev).add(item.id));
        setErroRemoverFundo(dados?.error || "Não consegui remover o fundo agora.");
        return;
      }
      setFalhouRecorte((prev) => {
        const novo = new Set(prev);
        novo.delete(item.id);
        return novo;
      });
      onChangeItem(item.id, { fotoSemFundoUrl: dados.url as string });
    } catch (err) {
      console.error("Erro ao remover fundo do item:", err);
      setFalhouRecorte((prev) => new Set(prev).add(item.id));
      setErroRemoverFundo("Não consegui remover o fundo agora.");
    } finally {
      emAndamento.current.delete(item.id);
      setRemovendoFundoId((atual) => (atual === item.id ? null : atual));
    }
  }

  // Recorte automático: toda peça que entra no look (ou que está num look antigo
  // sem o recorte certo) tem o fundo removido sozinha, uma de cada vez.
  useEffect(() => {
    const pendente = itens.find(
      (i) => precisaRecorte(i) && !falhouRecorte.has(i.id) && !emAndamento.current.has(i.id)
    );
    if (pendente && emAndamento.current.size === 0) {
      removerFundoDoItem(pendente);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, pieces, falhouRecorte, removendoFundoId]);

  const itemSelecionado = itens.find((i) => i.id === selecionadoId) ?? null;
  const pecaArrastando = arrastando ? pieces.find((p) => p.id === arrastando.pecaId) : null;

  return (
    <div>
      <div
        ref={canvasRef}
        onPointerDown={() => setSelecionadoId(null)}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-black/10 bg-white"
      >
        {itens.map((item) => {
          const peca = pieces.find((p) => p.id === item.pecaId);
          if (!peca?.fotoUrl) return null;
          const selecionado = item.id === selecionadoId;
          const fotoExibida = item.fotoSemFundoUrl ?? peca.fotoUrl;
          return (
            <div
              key={item.id}
              onPointerDown={(e) => iniciarMovimento(e, item)}
              className="absolute touch-none"
              style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.largura}%` }}
            >
              <div
                className={`relative ${
                  selecionado ? "outline outline-2 outline-[var(--color-ink)] outline-offset-2" : ""
                }`}
              >
                {removendoFundoId === item.id && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[10px] text-black/60 shadow-sm">
                    Tirando o fundo…
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoExibida}
                  alt={peca.tipo}
                  className="pointer-events-none w-full select-none"
                  draggable={false}
                />
                {selecionado && (
                  <div
                    onPointerDown={(e) => iniciarRedimensionamento(e, item)}
                    className="absolute -bottom-2 -right-2 flex h-6 w-6 touch-none items-center justify-center rounded-full border-2 border-white bg-[var(--color-ink)] text-white shadow"
                  >
                    <i className="fi-rr-expand text-[10px]" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {itens.length === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-black/30">
            Arraste peças aqui pra montar o look
          </p>
        )}
      </div>

      {itemSelecionado && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {falhouRecorte.has(itemSelecionado.id) && (
            <button
              type="button"
              onClick={() => {
                setFalhouRecorte((prev) => {
                  const novo = new Set(prev);
                  novo.delete(itemSelecionado.id);
                  return novo;
                });
              }}
              className="rounded-full border border-black/20 px-3 py-1.5 text-xs text-black/70"
            >
              Tentar tirar o fundo de novo
            </button>
          )}
          <button
            type="button"
            onClick={() => trazerParaFrente(itemSelecionado.id)}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/60"
          >
            Trazer pra frente
          </button>
          <button
            type="button"
            onClick={() => enviarParaTras(itemSelecionado.id)}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/60"
          >
            Enviar pra trás
          </button>
          <button
            type="button"
            onClick={() => remover(itemSelecionado.id)}
            className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-500"
          >
            Remover
          </button>
        </div>
      )}
      {erroRemoverFundo && <p className="mt-2 text-center text-xs text-red-600">{erroRemoverFundo}</p>}

      <p className="mb-2 mt-6 text-xs text-black/50">Arraste uma peça para o canvas</p>
      <FiltroTipos
        pecas={pecasDisponiveis}
        selecionado={tipoFiltro}
        onSelecionar={setTipoFiltro}
        className="mb-3"
      />
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {pecasFiltradas.map((p) => (
          <button
            key={p.id}
            type="button"
            onPointerDown={(e) => iniciarArrastoDaTira(e, p)}
            className={`relative h-20 w-16 shrink-0 touch-none overflow-hidden rounded-xl border bg-white ${
              pecasNoCanvas.has(p.id) ? "border-[var(--color-ink)]" : "border-black/10"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.fotoUrl} alt={p.tipo} className="h-full w-full object-contain" draggable={false} />
          </button>
        ))}
        {pecasDisponiveis.length === 0 && (
          <p className="text-xs text-black/40">Cadastre peças com foto no Armário primeiro.</p>
        )}
      </div>

      {pecaArrastando && arrastando && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pecaArrastando.fotoUrl}
          alt=""
          className="pointer-events-none fixed z-50 w-24 opacity-80"
          style={{ left: arrastando.x - 48, top: arrastando.y - 48 }}
        />
      )}
    </div>
  );
}
