"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clima, Estacao, Ocasiao, Piece, Tipo } from "@/lib/types";
import { addPiece } from "@/lib/storage";

const TIPOS: Tipo[] = ["Blusas", "Calças", "Sapatos", "Acessórios"];
const OCASIOES: Ocasiao[] = ["Casual", "Trabalho", "Festa chique", "Balada eletrônica"];
const ESTACOES: Estacao[] = ["Verão", "Inverno", "Outono", "Primavera"];
const CLIMAS: Clima[] = ["Frio", "Sol", "Chuva"];
const CORES = ["#C1694A", "#5C7A54", "#262220", "#8B7355", "#3B4A63", "#B23A48", "#D9C9A8"];

export default function AdicionarPecaPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("Blusas");
  const [ocasioes, setOcasioes] = useState<Ocasiao[]>([]);
  const [cor, setCor] = useState(CORES[0]);
  const [estacao, setEstacao] = useState<Estacao>("Outono");
  const [clima, setClima] = useState<Clima>("Frio");
  const [favorita, setFavorita] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [marca, setMarca] = useState("");
  const [notas, setNotas] = useState("");
  const [estampa, setEstampa] = useState("");

  function toggleOcasiao(o: Ocasiao) {
    setOcasioes((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const piece: Piece = {
      id: crypto.randomUUID(),
      tipo,
      ocasioes,
      cor,
      estacao,
      clima,
      favorita,
      marca: marca || undefined,
      notas: notas || undefined,
      estampa: estampa || undefined,
      criadaEm: new Date().toISOString(),
    };
    addPiece(piece);
    router.push("/");
  }

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-[var(--color-sage)]">Nova peça</p>
        <h1 className="font-[var(--font-fraunces)] text-2xl">Adicionar peça</h1>
        <p className="mt-1 text-sm text-black/50">
          Por enquanto o cadastro é manual — a remoção de fundo e o preenchimento
          automático por IA entram na V2.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-black/10 text-sm text-black/40">
          Foto da peça (em breve)
        </div>

        <Field label="Tipo">
          <ChipGroup options={TIPOS} selected={[tipo]} onToggle={(o) => setTipo(o as Tipo)} />
        </Field>

        <Field label="Ocasião">
          <ChipGroup options={OCASIOES} selected={ocasioes} onToggle={(o) => toggleOcasiao(o as Ocasiao)} />
        </Field>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCor(c)}
                className={`h-9 w-9 rounded-full border-2 ${
                  cor === c ? "border-[var(--color-terracota)]" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <Field label="Estação">
          <ChipGroup options={ESTACOES} selected={[estacao]} onToggle={(o) => setEstacao(o as Estacao)} />
        </Field>

        <Field label="Clima">
          <ChipGroup options={CLIMAS} selected={[clima]} onToggle={(o) => setClima(o as Clima)} />
        </Field>

        <label className="flex items-center justify-between rounded-2xl border border-black/10 px-4 py-3">
          <span className="text-sm font-medium">Favorita</span>
          <input
            type="checkbox"
            checked={favorita}
            onChange={(e) => setFavorita(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-terracota)]"
          />
        </label>

        <button
          type="button"
          onClick={() => setDetalhesAbertos((v) => !v)}
          className="text-sm font-medium text-[var(--color-sage)]"
        >
          {detalhesAbertos ? "− menos detalhes" : "+ mais detalhes"}
        </button>

        {detalhesAbertos && (
          <div className="space-y-3">
            <TextField label="Marca" value={marca} onChange={setMarca} />
            <TextField label="Estampa / padrão" value={estampa} onChange={setEstampa} />
            <TextField label="Notas" value={notas} onChange={setNotas} />
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-[var(--color-terracota)] py-3 font-medium text-white"
        >
          Salvar no armário
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-black/50">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
      />
    </label>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            type="button"
            key={option}
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              active
                ? "border-[var(--color-terracota)] bg-[var(--color-terracota)]/10 text-[var(--color-terracota)]"
                : "border-black/10 text-black/60"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
