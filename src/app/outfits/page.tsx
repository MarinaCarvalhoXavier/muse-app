"use client";

import { useEffect, useState } from "react";
import { Outfit, Piece } from "@/lib/types";
import { addOutfit, getOutfits, getPieces } from "@/lib/storage";

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [secoesInput, setSecoesInput] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    setOutfits(getOutfits());
    setPieces(getPieces());
  }, []);

  function togglePeca(id: string) {
    setSelecionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || selecionadas.length === 0) return;
    const outfit: Outfit = {
      id: crypto.randomUUID(),
      nome,
      pecaIds: selecionadas,
      secoes: secoesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      criadoEm: new Date().toISOString(),
    };
    addOutfit(outfit);
    setOutfits(getOutfits());
    setNome("");
    setSecoesInput("");
    setSelecionadas([]);
    setShowForm(false);
  }

  const secoesUnicas = Array.from(
    new Set(outfits.flatMap((o) => (o.secoes.length ? o.secoes : ["Sem categoria"])))
  );

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Muse</p>
          <h1 className="font-[var(--font-fraunces)] text-2xl">Outfits</h1>
          <p className="text-sm text-black/50">{outfits.length} looks salvos</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full border border-[var(--color-terracota)] px-3 py-1.5 text-sm text-[var(--color-terracota)]"
        >
          {showForm ? "Cancelar" : "Novo look"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-2xl border border-black/10 p-4">
          <label className="block">
            <span className="mb-1 block text-xs text-black/50">Nome do look</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Ex: Reunião de terça"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-black/50">
              Seções (separadas por vírgula — deixe vazio pra &quot;sem categoria&quot;)
            </span>
            <input
              value={secoesInput}
              onChange={(e) => setSecoesInput(e.target.value)}
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Ex: Trabalho, Casual"
            />
          </label>

          <div>
            <p className="mb-2 text-xs text-black/50">Peças do look</p>
            <div className="flex flex-wrap gap-2">
              {pieces.map((p) => {
                const active = selecionadas.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => togglePeca(p.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      active
                        ? "border-[var(--color-terracota)] bg-[var(--color-terracota)]/10 text-[var(--color-terracota)]"
                        : "border-black/10 text-black/60"
                    }`}
                  >
                    {p.tipo} · {p.cor}
                  </button>
                );
              })}
            </div>
            {pieces.length === 0 && (
              <p className="text-xs text-black/40">Cadastre peças no Armário primeiro.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[var(--color-terracota)] py-2.5 text-sm font-medium text-white"
          >
            Salvar look
          </button>
        </form>
      )}

      {secoesUnicas.length === 0 && (
        <p className="mt-16 text-center text-sm text-black/40">
          Nenhum look salvo ainda. Toque em &quot;Novo look&quot; pra criar o primeiro.
        </p>
      )}

      {secoesUnicas.map((secao) => {
        const looksDaSecao = outfits.filter((o) =>
          secao === "Sem categoria" ? o.secoes.length === 0 : o.secoes.includes(secao)
        );
        return (
          <section key={secao} className="mb-8">
            <h2 className="mb-3 font-[var(--font-fraunces)] text-lg">{secao}</h2>
            <div className="space-y-2">
              {looksDaSecao.map((o) => (
                <div key={o.id} className="rounded-2xl border border-black/5 bg-white p-3">
                  <p className="text-sm font-medium">{o.nome}</p>
                  <p className="text-xs text-black/40">{o.pecaIds.length} peças</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
