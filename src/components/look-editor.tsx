"use client";

import { useEffect, useRef, useState } from "react";
import { OutfitItem, Piece } from "@/lib/types";
import { generateId } from "@/lib/id";
import { nomeDoRecorte } from "@/lib/recorte";
import { pecaResumo } from "@/lib/peca-resumo";
import { FiltroTipos, TODAS, filtrarPorTipo } from "@/components/filtro-tipos";

// Editor de looks em tela cheia, inspirado no collage do Pinterest e no Canva:
// - topo: fechar, desfazer/refazer e Salvar;
// - canvas grande (proporção 3:4) com fundo de pontinhos;
// - embaixo: "+ Adicionar peça" (abre uma gaveta) ou, com uma peça selecionada,
//   as ações dela (Trocar, Trocar com IA, Duplicar, Frente, Trás, Excluir);
// - gestos: um dedo arrasta, dois dedos (pinça) aumentam/diminuem; arrastar até
//   a lixeira apaga; o fundo de cada peça sai sozinho.

const LARGURA_PADRAO = 38; // % da largura do canvas

// Objetos entram no look menores que as roupas, pra precisar ajustar menos.
const LARGURA_POR_TIPO: Record<string, number> = {
  Acessórios: 16,
  Bolsas: 24,
  Sapatos: 22,
};
function larguraInicial(tipo: string): number {
  return LARGURA_POR_TIPO[tipo] ?? LARGURA_PADRAO;
}

const LARGURA_MIN = 6;
const LARGURA_MAX = 95;

type Ponto = { x: number; y: number };
type Gesto = {
  itemId: string;
  ponteiros: Map<number, Ponto>;
  modo: "mover" | "pinca";
  mexeu: boolean;
  // mover
  inicio?: Ponto;
  xOriginal?: number;
  yOriginal?: number;
  // pinça
  distInicial?: number;
  meioInicial?: Ponto;
  larguraInicial?: number;
  centroInicial?: Ponto; // em % do canvas
  proporcao?: number; // altura/largura da peça na tela
};

type Gaveta = { modo: "adicionar" } | { modo: "trocar"; itemId: string };

export function LookEditor({
  titulo,
  pieces,
  itensIniciais,
  nomeInicial,
  onSalvar,
  onFechar,
  onExcluir,
}: {
  titulo: string;
  pieces: Piece[];
  itensIniciais: OutfitItem[];
  nomeInicial: string;
  onSalvar: (nome: string, itens: OutfitItem[]) => Promise<string | null>;
  onFechar: () => void;
  onExcluir?: () => Promise<void>;
}) {
  const [itens, setItensEstado] = useState<OutfitItem[]>(itensIniciais);
  const itensRef = useRef(itens);
  function setItens(novos: OutfitItem[]) {
    itensRef.current = novos;
    setItensEstado(novos);
  }

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [gaveta, setGaveta] = useState<Gaveta | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string>(TODAS);
  const [salvarAberto, setSalvarAberto] = useState(false);
  const [sairAberto, setSairAberto] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [nome, setNome] = useState(nomeInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trocandoComIa, setTrocandoComIa] = useState(false);
  const [alterado, setAlterado] = useState(false);

  // Lixeira: aparece enquanto uma peça é arrastada.
  const [arrastandoItem, setArrastandoItem] = useState(false);
  const [sobreLixeira, setSobreLixeira] = useState(false);
  const lixeiraRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Desfazer / refazer
  // ---------------------------------------------------------------------------
  const desfazerPilha = useRef<OutfitItem[][]>([]);
  const refazerPilha = useRef<OutfitItem[][]>([]);
  const [contagemHistorico, setContagemHistorico] = useState({ desfazer: 0, refazer: 0 });
  function atualizarContagem() {
    setContagemHistorico({ desfazer: desfazerPilha.current.length, refazer: refazerPilha.current.length });
  }

  function registrarHistorico() {
    desfazerPilha.current.push(itensRef.current);
    if (desfazerPilha.current.length > 50) desfazerPilha.current.shift();
    refazerPilha.current = [];
    atualizarContagem();
    setAlterado(true);
  }
  function desfazer() {
    const anterior = desfazerPilha.current.pop();
    if (!anterior) return;
    refazerPilha.current.push(itensRef.current);
    setItens(anterior);
    setSelecionadoId(null);
    atualizarContagem();
  }
  function refazer() {
    const proximo = refazerPilha.current.pop();
    if (!proximo) return;
    desfazerPilha.current.push(itensRef.current);
    setItens(proximo);
    setSelecionadoId(null);
    atualizarContagem();
  }

  function atualizarItem(id: string, patch: Partial<OutfitItem>) {
    setItens(itensRef.current.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  // ---------------------------------------------------------------------------
  // Canvas sempre em 3:4, do maior tamanho que couber na tela
  // ---------------------------------------------------------------------------
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tamanhoCanvas, setTamanhoCanvas] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const medir = () => {
      const { width, height } = area.getBoundingClientRect();
      const w = Math.min(width, (height * 3) / 4);
      setTamanhoCanvas({ w, h: (w * 4) / 3 });
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(area);
    return () => obs.disconnect();
  }, []);

  function getCanvasRect() {
    return canvasRef.current?.getBoundingClientRect() ?? null;
  }

  // Impede o zoom da página do Safari quando a pinça é feita no canvas.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const bloquear = (ev: Event) => ev.preventDefault();
    el.addEventListener("gesturestart", bloquear);
    el.addEventListener("gesturechange", bloquear);
    return () => {
      el.removeEventListener("gesturestart", bloquear);
      el.removeEventListener("gesturechange", bloquear);
    };
  }, [tamanhoCanvas]);

  // ---------------------------------------------------------------------------
  // Recorte automático do fundo (uma vez por foto, reaproveitado entre looks)
  // ---------------------------------------------------------------------------
  const [removendoFundoId, setRemovendoFundoId] = useState<string | null>(null);
  const [falhouRecorte, setFalhouRecorte] = useState<Set<string>>(new Set());
  const emAndamento = useRef<Set<string>>(new Set());
  // Itens já recortados com sucesso (por item + peça), pra nunca pedir de novo em loop.
  const recortados = useRef<Set<string>>(new Set());

  function precisaRecorte(item: OutfitItem): boolean {
    const peca = pieces.find((p) => p.id === item.pecaId);
    if (!peca?.fotoUrl) return false;
    if (recortados.current.has(`${item.id}:${item.pecaId}`)) return false;
    return !item.fotoSemFundoUrl?.includes(nomeDoRecorte(peca.fotoUrl));
  }

  async function removerFundoDoItem(item: OutfitItem) {
    const peca = pieces.find((p) => p.id === item.pecaId);
    if (!peca?.fotoUrl || emAndamento.current.has(item.id)) return;
    emAndamento.current.add(item.id);
    setRemovendoFundoId(item.id);
    try {
      const res = await fetch("/api/remover-fundo-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoUrl: peca.fotoUrl }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok || !dados?.url) {
        setFalhouRecorte((prev) => new Set(prev).add(item.id));
        return;
      }
      setFalhouRecorte((prev) => {
        const novo = new Set(prev);
        novo.delete(item.id);
        return novo;
      });
      // Só aplica se a peça ainda é a mesma (pode ter sido trocada nesse meio-tempo).
      const atual = itensRef.current.find((i) => i.id === item.id);
      recortados.current.add(`${item.id}:${item.pecaId}`);
      if (atual && atual.pecaId === item.pecaId) {
        atualizarItem(item.id, { fotoSemFundoUrl: dados.url as string });
      }
    } catch (err) {
      console.error("Erro ao remover fundo do item:", err);
      setFalhouRecorte((prev) => new Set(prev).add(item.id));
    } finally {
      emAndamento.current.delete(item.id);
      setRemovendoFundoId((atual) => (atual === item.id ? null : atual));
    }
  }

  useEffect(() => {
    const pendente = itens.find(
      (i) => precisaRecorte(i) && !falhouRecorte.has(i.id) && !emAndamento.current.has(i.id)
    );
    if (pendente && emAndamento.current.size === 0) {
      removerFundoDoItem(pendente);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, pieces, falhouRecorte, removendoFundoId]);

  // ---------------------------------------------------------------------------
  // Gestos: um dedo arrasta; dois dedos (pinça) mudam o tamanho
  // ---------------------------------------------------------------------------
  const gestoRef = useRef<Gesto | null>(null);

  function distancia(a: Ponto, b: Ponto) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function meio(a: Ponto, b: Ponto): Ponto {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  function dentroDaLixeira(p: Ponto) {
    const r = lixeiraRef.current?.getBoundingClientRect();
    if (!r) return false;
    const folga = 16;
    return p.x >= r.left - folga && p.x <= r.right + folga && p.y >= r.top - folga && p.y <= r.bottom + folga;
  }

  function comecarMover(gesto: Gesto, ponto: Ponto) {
    const item = itensRef.current.find((i) => i.id === gesto.itemId);
    if (!item) return;
    gesto.modo = "mover";
    gesto.inicio = ponto;
    gesto.xOriginal = item.x;
    gesto.yOriginal = item.y;
  }

  function comecarPinca(gesto: Gesto) {
    const item = itensRef.current.find((i) => i.id === gesto.itemId);
    const rect = getCanvasRect();
    const [p1, p2] = Array.from(gesto.ponteiros.values());
    if (!item || !rect || !p1 || !p2) return;
    const el = canvasRef.current?.querySelector<HTMLElement>(`[data-item-id="${item.id}"]`);
    const caixa = el?.getBoundingClientRect();
    const proporcao = caixa && caixa.width > 0 ? caixa.height / caixa.width : 1;
    const alturaPct = item.largura * proporcao * (rect.width / rect.height);
    gesto.modo = "pinca";
    gesto.distInicial = Math.max(distancia(p1, p2), 1);
    gesto.meioInicial = meio(p1, p2);
    gesto.larguraInicial = item.largura;
    gesto.proporcao = proporcao;
    gesto.centroInicial = { x: item.x + item.largura / 2, y: item.y + alturaPct / 2 };
    setArrastandoItem(false);
    setSobreLixeira(false);
  }

  function aoMoverPonteiro(ev: PointerEvent) {
    const gesto = gestoRef.current;
    if (!gesto || !gesto.ponteiros.has(ev.pointerId)) return;
    const ponto = { x: ev.clientX, y: ev.clientY };
    gesto.ponteiros.set(ev.pointerId, ponto);
    const rect = getCanvasRect();
    if (!rect) return;

    if (gesto.modo === "mover" && gesto.inicio) {
      const dx = ev.clientX - gesto.inicio.x;
      const dy = ev.clientY - gesto.inicio.y;
      if (!gesto.mexeu && Math.hypot(dx, dy) < 4) return;
      if (!gesto.mexeu) {
        gesto.mexeu = true;
        registrarHistorico();
      }
      setArrastandoItem(true);
      setSobreLixeira(dentroDaLixeira(ponto));
      atualizarItem(gesto.itemId, {
        x: Math.min(Math.max((gesto.xOriginal ?? 0) + (dx / rect.width) * 100, -20), 95),
        y: Math.min(Math.max((gesto.yOriginal ?? 0) + (dy / rect.height) * 100, -20), 95),
      });
      return;
    }

    if (gesto.modo === "pinca") {
      const [p1, p2] = Array.from(gesto.ponteiros.values());
      if (!p1 || !p2 || !gesto.distInicial || !gesto.meioInicial || !gesto.centroInicial) return;
      if (!gesto.mexeu) {
        gesto.mexeu = true;
        registrarHistorico();
      }
      const escala = distancia(p1, p2) / gesto.distInicial;
      const largura = Math.min(
        Math.max((gesto.larguraInicial ?? LARGURA_PADRAO) * escala, LARGURA_MIN),
        LARGURA_MAX
      );
      const alturaPct = largura * (gesto.proporcao ?? 1) * (rect.width / rect.height);
      // O centro acompanha o meio entre os dois dedos (dá pra mover enquanto ajusta).
      const m = meio(p1, p2);
      const cx = gesto.centroInicial.x + ((m.x - gesto.meioInicial.x) / rect.width) * 100;
      const cy = gesto.centroInicial.y + ((m.y - gesto.meioInicial.y) / rect.height) * 100;
      atualizarItem(gesto.itemId, { largura, x: cx - largura / 2, y: cy - alturaPct / 2 });
    }
  }

  function aoSoltarPonteiro(ev: PointerEvent) {
    const gesto = gestoRef.current;
    if (!gesto) return;
    const soltouNaLixeira =
      gesto.modo === "mover" && gesto.mexeu && dentroDaLixeira({ x: ev.clientX, y: ev.clientY });
    gesto.ponteiros.delete(ev.pointerId);

    if (soltouNaLixeira) {
      // O histórico já guardou o estado antes do arrasto, então dá pra desfazer.
      setItens(itensRef.current.filter((i) => i.id !== gesto.itemId));
      setSelecionadoId(null);
    }

    if (gesto.ponteiros.size === 1 && !soltouNaLixeira) {
      // Tirou um dedo da pinça: continua arrastando com o outro.
      const [restante] = Array.from(gesto.ponteiros.values());
      comecarMover(gesto, restante);
      gesto.mexeu = true;
    } else if (gesto.ponteiros.size === 0 || soltouNaLixeira) {
      gestoRef.current = null;
      setArrastandoItem(false);
      setSobreLixeira(false);
      window.removeEventListener("pointermove", aoMoverPonteiro);
      window.removeEventListener("pointerup", aoSoltarPonteiro);
      window.removeEventListener("pointercancel", aoSoltarPonteiro);
    }
  }

  function aoTocarPeca(e: React.PointerEvent, item: OutfitItem) {
    e.preventDefault();
    e.stopPropagation();
    const ponto = { x: e.clientX, y: e.clientY };
    const gesto = gestoRef.current;
    if (gesto) {
      // Segundo dedo (mesmo em outra peça): vira pinça na peça do primeiro dedo.
      if (gesto.ponteiros.size === 1) {
        gesto.ponteiros.set(e.pointerId, ponto);
        comecarPinca(gesto);
      }
      return;
    }
    setSelecionadoId(item.id);
    const novo: Gesto = {
      itemId: item.id,
      ponteiros: new Map([[e.pointerId, ponto]]),
      modo: "mover",
      mexeu: false,
    };
    gestoRef.current = novo;
    comecarMover(novo, ponto);
    window.addEventListener("pointermove", aoMoverPonteiro);
    window.addEventListener("pointerup", aoSoltarPonteiro);
    window.addEventListener("pointercancel", aoSoltarPonteiro);
  }

  // Dedo no fundo: se já tem um dedo numa peça, é o segundo dedo da pinça;
  // senão, só tira a seleção.
  function aoTocarFundo(e: React.PointerEvent) {
    const gesto = gestoRef.current;
    if (gesto && gesto.ponteiros.size === 1) {
      e.preventDefault();
      gesto.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      comecarPinca(gesto);
      return;
    }
    setSelecionadoId(null);
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  const pecasComFoto = pieces.filter((p) => p.fotoUrl);
  const itemSelecionado = itens.find((i) => i.id === selecionadoId) ?? null;
  const pecaSelecionada = itemSelecionado ? pieces.find((p) => p.id === itemSelecionado.pecaId) : null;

  function abrirGavetaAdicionar() {
    setTipoFiltro(TODAS);
    setGaveta({ modo: "adicionar" });
  }

  function abrirGavetaTrocar() {
    if (!itemSelecionado || !pecaSelecionada) return;
    setTipoFiltro(pecaSelecionada.tipo);
    setGaveta({ modo: "trocar", itemId: itemSelecionado.id });
  }

  function adicionarPeca(peca: Piece) {
    registrarHistorico();
    const largura = larguraInicial(peca.tipo);
    // Cada peça nova entra no centro, um pouco deslocada da anterior pra não sumir embaixo.
    const deslocamento = (itensRef.current.length % 5) * 3;
    const novo: OutfitItem = {
      id: generateId(),
      pecaId: peca.id,
      x: 50 - largura / 2 + deslocamento,
      y: 25 + deslocamento,
      largura,
    };
    setItens([...itensRef.current, novo]);
    // Não seleciona a peça nova: assim o "Adicionar peça" continua à mão pra próxima.
    setSelecionadoId(null);
    setGaveta(null);
  }

  function trocarPeca(itemId: string, peca: Piece) {
    registrarHistorico();
    atualizarItem(itemId, { pecaId: peca.id, fotoSemFundoUrl: undefined });
    setFalhouRecorte((prev) => {
      const novo = new Set(prev);
      novo.delete(itemId);
      return novo;
    });
    setGaveta(null);
  }

  async function trocarComIa() {
    if (!itemSelecionado) return;
    setTrocandoComIa(true);
    setAviso(null);
    try {
      const res = await fetch("/api/sugerir-outfit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modo: "trocar",
          pecas: pecasComFoto.map(pecaResumo),
          pecaIdsAtuais: itensRef.current.map((i) => i.pecaId),
          pecaIdParaTrocar: itemSelecionado.pecaId,
        }),
      });
      const dados = await res.json().catch(() => null);
      const nova = dados?.pecaId ? pieces.find((p) => p.id === dados.pecaId) : null;
      if (!res.ok || !nova) {
        setAviso("A IA não achou uma troca melhor agora.");
        return;
      }
      trocarPeca(itemSelecionado.id, nova);
      setAviso(`A IA trocou por: ${[nova.tipo, ...(nova.subtipos ?? [])].join(", ")}`);
    } catch {
      setAviso("A IA não achou uma troca melhor agora.");
    } finally {
      setTrocandoComIa(false);
    }
  }

  function duplicar() {
    if (!itemSelecionado) return;
    registrarHistorico();
    const copia: OutfitItem = {
      ...itemSelecionado,
      id: generateId(),
      x: itemSelecionado.x + 4,
      y: itemSelecionado.y + 4,
    };
    setItens([...itensRef.current, copia]);
    setSelecionadoId(copia.id);
  }

  function trazerParaFrente() {
    if (!itemSelecionado) return;
    registrarHistorico();
    setItens([...itensRef.current.filter((i) => i.id !== itemSelecionado.id), itemSelecionado]);
  }

  function enviarParaTras() {
    if (!itemSelecionado) return;
    registrarHistorico();
    setItens([itemSelecionado, ...itensRef.current.filter((i) => i.id !== itemSelecionado.id)]);
  }

  function excluir() {
    if (!itemSelecionado) return;
    registrarHistorico();
    setItens(itensRef.current.filter((i) => i.id !== itemSelecionado.id));
    setSelecionadoId(null);
  }

  async function salvar() {
    if (itensRef.current.length === 0) {
      setErro("Adicione ao menos uma peça ao look.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const erroSalvar = await onSalvar(nome.trim() || "Look sem nome", itensRef.current);
    setSalvando(false);
    if (erroSalvar) setErro(erroSalvar);
  }

  function fechar() {
    if (alterado) setSairAberto(true);
    else onFechar();
  }

  // Aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const pecasDaGaveta = filtrarPorTipo(pecasComFoto, tipoFiltro);
  const podeDesfazer = contagemHistorico.desfazer > 0;
  const podeRefazer = contagemHistorico.refazer > 0;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-[var(--color-paper)]">
      {/* Topo */}
      <header className="flex h-14 shrink-0 items-center gap-1 px-2">
        <BotaoIcone icone="fi-rr-cross" rotulo="Fechar" onClick={fechar} />
        <BotaoIcone icone="fi-rr-undo" rotulo="Desfazer" onClick={desfazer} desabilitado={!podeDesfazer} />
        <BotaoIcone icone="fi-rr-redo" rotulo="Refazer" onClick={refazer} desabilitado={!podeRefazer} />
        <p className="flex-1 truncate text-center text-sm font-medium text-black/60">{titulo}</p>
        <button
          type="button"
          onClick={() => {
            setErro(null);
            setSalvarAberto(true);
          }}
          className="rounded-full bg-[var(--color-lime)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
        >
          Salvar
        </button>
      </header>

      {/* Canvas */}
      <div ref={areaRef} className="relative flex min-h-0 flex-1 items-center justify-center px-3">
        {tamanhoCanvas && (
          <div
            ref={canvasRef}
            onPointerDown={aoTocarFundo}
            className="relative touch-none select-none overflow-hidden rounded-2xl border border-black/10 bg-white"
            style={{
              width: tamanhoCanvas.w,
              height: tamanhoCanvas.h,
              backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          >
            {itens.map((item) => {
              const peca = pieces.find((p) => p.id === item.pecaId);
              if (!peca?.fotoUrl) return null;
              const selecionado = item.id === selecionadoId;
              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  onPointerDown={(e) => aoTocarPeca(e, item)}
                  className="absolute touch-none"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${item.largura}%`,
                    opacity: selecionado && sobreLixeira ? 0.4 : 1,
                  }}
                >
                  <div
                    className={`relative ${
                      selecionado ? "outline outline-2 outline-[var(--color-ink)] outline-offset-2" : ""
                    }`}
                  >
                    {removendoFundoId === item.id && (
                      <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[10px] text-black/60 shadow-sm">
                        Tirando o fundo…
                      </span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.fotoSemFundoUrl ?? peca.fotoUrl}
                      alt={peca.tipo}
                      className="pointer-events-none w-full select-none"
                      draggable={false}
                    />
                  </div>
                </div>
              );
            })}

            {itens.length === 0 && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-black/35">
                Toque em “Adicionar peça” pra começar o look
              </p>
            )}

            {/* Lixeira: aparece enquanto arrasta uma peça */}
            {arrastandoItem && (
              <div
                ref={lixeiraRef}
                className={`pointer-events-none absolute bottom-4 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full shadow-lg transition-transform ${
                  sobreLixeira ? "scale-125 bg-red-500 text-white" : "bg-white text-black/60"
                }`}
              >
                <i className="fi-rr-trash text-xl" aria-hidden="true" />
              </div>
            )}
          </div>
        )}

        {aviso && (
          <p className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--color-ink)] px-3 py-1.5 text-xs text-white shadow">
            {aviso}
          </p>
        )}
      </div>

      {/* Barra de baixo */}
      <div className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        {itemSelecionado ? (
          <div className="grid grid-cols-6 gap-1">
            <Acao icone="fi-rr-arrows-repeat" rotulo="Trocar" onClick={abrirGavetaTrocar} />
            <Acao
              icone="fi-rr-sparkles"
              rotulo={trocandoComIa ? "Pensando…" : "Trocar c/ IA"}
              onClick={trocarComIa}
              desabilitado={trocandoComIa}
            />
            <Acao icone="fi-rr-duplicate" rotulo="Duplicar" onClick={duplicar} />
            <Acao icone="fi-rr-bring-forward" rotulo="Frente" onClick={trazerParaFrente} />
            <Acao icone="fi-rr-send-backward" rotulo="Trás" onClick={enviarParaTras} />
            <Acao icone="fi-rr-trash" rotulo="Excluir" onClick={excluir} perigo />
            {falhouRecorte.has(itemSelecionado.id) && (
              <button
                type="button"
                onClick={() =>
                  setFalhouRecorte((prev) => {
                    const novo = new Set(prev);
                    novo.delete(itemSelecionado.id);
                    return novo;
                  })
                }
                className="col-span-6 mt-2 rounded-full border border-black/15 py-1.5 text-xs text-black/60"
              >
                Tentar tirar o fundo de novo
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={abrirGavetaAdicionar}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] py-3.5 text-sm font-semibold text-white"
            >
              <i className="fi-rr-plus text-sm" aria-hidden="true" /> Adicionar peça
            </button>
            {itens.length > 0 && (
              <p className="mt-2 text-center text-[11px] text-black/40">
                Toque numa peça pra ver as opções · pinça muda o tamanho
              </p>
            )}
          </>
        )}
      </div>

      {/* Gaveta de peças (adicionar ou trocar) */}
      {gaveta && (
        <Folha onFechar={() => setGaveta(null)} titulo={gaveta.modo === "trocar" ? "Trocar por…" : "Suas peças"}>
          {gaveta.modo === "trocar" && (
            <button
              type="button"
              onClick={() => {
                setGaveta(null);
                trocarComIa();
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-lime)] py-2.5 text-sm font-medium text-[var(--color-ink)]"
            >
              <i className="fi-rr-sparkles text-xs" aria-hidden="true" /> Deixar a IA escolher
            </button>
          )}
          <FiltroTipos pecas={pecasComFoto} selecionado={tipoFiltro} onSelecionar={setTipoFiltro} className="mb-3" />
          {pecasDaGaveta.length === 0 ? (
            <p className="py-10 text-center text-sm text-black/40">Nenhuma peça com foto aqui ainda.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 pb-4">
              {pecasDaGaveta.map((p) => {
                const jaNoLook = itens.some((i) => i.pecaId === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      gaveta.modo === "trocar" ? trocarPeca(gaveta.itemId, p) : adicionarPeca(p)
                    }
                    aria-label={[p.tipo, ...(p.subtipos ?? [])].join(", ")}
                    className={`relative aspect-[3/4] overflow-hidden rounded-xl border bg-white ${
                      jaNoLook ? "border-[var(--color-ink)]" : "border-black/10"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.fotoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                    {jaNoLook && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-[var(--color-ink)] px-1.5 py-0.5 text-[9px] text-white">
                        no look
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Folha>
      )}

      {/* Salvar */}
      {salvarAberto && (
        <Folha onFechar={() => setSalvarAberto(false)} titulo="Salvar look" compacta>
          <label className="mb-1 block text-xs font-medium text-black/60" htmlFor="nome-look">
            Nome do look
          </label>
          <input
            id="nome-look"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Reunião de terça"
            className="mb-4 w-full rounded-xl border border-black/15 px-3 py-2.5 text-base"
          />
          {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-full bg-[var(--color-lime)] py-3 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar look"}
          </button>
          {onExcluir && (
            <div className="mt-4 text-center">
              {confirmandoExclusao ? (
                <div className="flex items-center justify-center gap-3 text-sm">
                  <span className="text-black/60">Excluir este look?</span>
                  <button type="button" onClick={() => setConfirmandoExclusao(false)} className="text-black/50">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => onExcluir()} className="font-medium text-red-600">
                    Excluir
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoExclusao(true)}
                  className="text-sm text-red-600"
                >
                  Excluir look
                </button>
              )}
            </div>
          )}
        </Folha>
      )}

      {/* Sair sem salvar */}
      {sairAberto && (
        <Folha onFechar={() => setSairAberto(false)} titulo="Sair sem salvar?" compacta>
          <p className="mb-4 text-sm text-black/60">As mudanças desse look vão se perder.</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSairAberto(false)}
              className="flex-1 rounded-full border border-black/15 py-2.5 text-sm font-medium"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 rounded-full bg-[var(--color-ink)] py-2.5 text-sm font-medium text-white"
            >
              Sair
            </button>
          </div>
        </Folha>
      )}
    </div>
  );
}

function BotaoIcone({
  icone,
  rotulo,
  onClick,
  desabilitado,
}: {
  icone: string;
  rotulo: string;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={rotulo}
      title={rotulo}
      className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-black/70 disabled:opacity-25"
    >
      <i className={icone} aria-hidden="true" />
    </button>
  );
}

function Acao({
  icone,
  rotulo,
  onClick,
  desabilitado,
  perigo,
}: {
  icone: string;
  rotulo: string;
  onClick: () => void;
  desabilitado?: boolean;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium disabled:opacity-50 ${
        perigo ? "text-red-600" : "text-black/70"
      }`}
    >
      <i className={`${icone} text-lg`} aria-hidden="true" />
      {rotulo}
    </button>
  );
}

// Folha que sobe de baixo (gaveta), com fundo escurecido.
function Folha({
  titulo,
  onFechar,
  children,
  compacta,
}: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  compacta?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col justify-end">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/30" />
      <div
        className={`relative flex flex-col rounded-t-3xl bg-white px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 shadow-2xl ${
          compacta ? "" : "h-[72vh]"
        }`}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-xl">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-black/50"
          >
            <i className="fi-rr-cross-small text-lg" aria-hidden="true" />
          </button>
        </div>
        <div className={compacta ? "" : "min-h-0 flex-1 overflow-y-auto"}>{children}</div>
      </div>
    </div>
  );
}
