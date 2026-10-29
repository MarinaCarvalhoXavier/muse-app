"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Outfit, Piece, Uso } from "@/lib/types";
import { LookMiniatura } from "@/components/look-miniatura";
import {
  addOutfit,
  deleteOutfit,
  getOutfits,
  getPieces,
  getUsos,
  hojeLocal,
  registrarUso,
  removerUso,
  updateOutfit,
} from "@/lib/storage";
import { generateId } from "@/lib/id";

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
  const router = useRouter();

  // Menu de opções ao segurar o dedo num look (long press).
  const [menuLook, setMenuLook] = useState<Outfit | null>(null);
  const [modoMenu, setModoMenu] = useState<"opcoes" | "renomear" | "excluir">("opcoes");
  const [novoNome, setNovoNome] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const pressionando = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const abriuPorPressao = useRef(false);

  function iniciarPressao(e: React.PointerEvent, look: Outfit) {
    abriuPorPressao.current = false;
    const x = e.clientX;
    const y = e.clientY;
    const timer = setTimeout(() => {
      abriuPorPressao.current = true;
      pressionando.current = null;
      abrirMenu(look);
    }, 450);
    pressionando.current = { timer, x, y };
  }
  function moverPressao(e: React.PointerEvent) {
    const p = pressionando.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelarPressao();
  }
  function cancelarPressao() {
    if (pressionando.current) clearTimeout(pressionando.current.timer);
    pressionando.current = null;
  }

  function abrirMenu(look: Outfit) {
    setMenuLook(look);
    setModoMenu("opcoes");
    setNovoNome(look.nome);
    setErro(null);
  }
  function fecharMenu() {
    setMenuLook(null);
  }

  async function renomear() {
    if (!menuLook) return;
    const nome = novoNome.trim() || "Look sem nome";
    setOcupado(true);
    const { error } = await updateOutfit(menuLook.id, { nome });
    setOcupado(false);
    if (error) return setErro("Não consegui renomear agora.");
    setOutfits((prev) => prev.map((o) => (o.id === menuLook.id ? { ...o, nome } : o)));
    fecharMenu();
  }

  async function duplicar() {
    if (!menuLook) return;
    setOcupado(true);
    const copia: Outfit = {
      ...menuLook,
      id: generateId(),
      nome: `${menuLook.nome} (cópia)`,
      itens: menuLook.itens.map((i) => ({ ...i, id: generateId() })),
      criadoEm: new Date().toISOString(),
    };
    const { error } = await addOutfit(copia);
    setOcupado(false);
    if (error) return setErro("Não consegui duplicar agora.");
    setOutfits((prev) => [copia, ...prev]);
    fecharMenu();
  }

  async function excluir() {
    if (!menuLook) return;
    setOcupado(true);
    const { error } = await deleteOutfit(menuLook.id);
    setOcupado(false);
    if (error) return setErro("Não consegui excluir agora.");
    setOutfits((prev) => prev.filter((o) => o.id !== menuLook.id));
    setUsos((prev) => prev.filter((u) => u.outfitId !== menuLook.id));
    fecharMenu();
  }

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
        {outfits.length > 0 && (
          <p className="mt-1 text-[11px] text-black/35">Segure um look pra ver mais opções</p>
        )}
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
              <Link
                href={`/outfits/${o.id}`}
                className="block select-none transition-transform active:scale-[0.98] [-webkit-touch-callout:none]"
                onPointerDown={(e) => iniciarPressao(e, o)}
                onPointerMove={moverPressao}
                onPointerUp={cancelarPressao}
                onPointerLeave={cancelarPressao}
                onPointerCancel={cancelarPressao}
                onContextMenu={(e) => {
                  // Clique direito no computador abre o mesmo menu.
                  e.preventDefault();
                  cancelarPressao();
                  abrirMenu(o);
                }}
                onClick={(e) => {
                  // Se o menu abriu por pressão, o toque não deve abrir o editor.
                  if (abriuPorPressao.current) {
                    e.preventDefault();
                    abriuPorPressao.current = false;
                  }
                }}
                draggable={false}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-white">
                  <LookMiniatura look={o} pieces={pieces} />
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

      {menuLook && (
        <div className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col justify-end">
          <button type="button" aria-label="Fechar" onClick={fecharMenu} className="absolute inset-0 bg-black/30" />
          <div className="relative rounded-t-3xl bg-white px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
            <p className="mb-3 truncate text-center font-[var(--font-display)] text-lg">{menuLook.nome}</p>

            {modoMenu === "opcoes" && (
              <div className="flex flex-col">
                <OpcaoMenu icone="fi-rr-pencil" rotulo="Editar look" onClick={() => router.push(`/outfits/${menuLook.id}`)} />
                {tabelaUsosExiste && (
                  <OpcaoMenu
                    icone="fi-rr-check"
                    rotulo={
                      usos.some((u) => u.outfitId === menuLook.id && u.usadoEm === hoje)
                        ? "Desmarcar uso de hoje"
                        : "Usei hoje"
                    }
                    onClick={async () => {
                      await alternarUsoHoje(menuLook.id);
                      fecharMenu();
                    }}
                  />
                )}
                <OpcaoMenu icone="fi-rr-text" rotulo="Renomear" onClick={() => setModoMenu("renomear")} />
                <OpcaoMenu icone="fi-rr-duplicate" rotulo={ocupado ? "Duplicando…" : "Duplicar"} onClick={duplicar} />
                <OpcaoMenu icone="fi-rr-trash" rotulo="Excluir look" perigo onClick={() => setModoMenu("excluir")} />
              </div>
            )}

            {modoMenu === "renomear" && (
              <div>
                <input
                  autoFocus
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome do look"
                  className="mb-3 w-full rounded-xl border border-black/15 px-3 py-2.5 text-base"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModoMenu("opcoes")} className="flex-1 rounded-full border border-black/15 py-2.5 text-sm font-medium">
                    Voltar
                  </button>
                  <button type="button" onClick={renomear} disabled={ocupado} className="flex-1 rounded-full bg-[var(--color-lime)] py-2.5 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60">
                    {ocupado ? "Salvando…" : "Salvar nome"}
                  </button>
                </div>
              </div>
            )}

            {modoMenu === "excluir" && (
              <div>
                <p className="mb-4 text-center text-sm text-black/60">
                  Excluir este look? O registro de uso dele também será apagado.
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModoMenu("opcoes")} className="flex-1 rounded-full border border-black/15 py-2.5 text-sm font-medium">
                    Cancelar
                  </button>
                  <button type="button" onClick={excluir} disabled={ocupado} className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {ocupado ? "Excluindo…" : "Excluir"}
                  </button>
                </div>
              </div>
            )}

            {erro && <p className="mt-3 text-center text-sm text-red-600">{erro}</p>}
          </div>
        </div>
      )}
    </main>
  );
}

function OpcaoMenu({
  icone,
  rotulo,
  onClick,
  perigo,
}: {
  icone: string;
  rotulo: string;
  onClick: () => void;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-2 py-3.5 text-left text-[15px] font-medium active:bg-black/5 ${
        perigo ? "text-red-600" : "text-[var(--color-ink)]"
      }`}
    >
      <i className={`${icone} text-lg`} aria-hidden="true" />
      {rotulo}
    </button>
  );
}
