"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Estacao, Ocasiao, Piece, Tipo } from "@/lib/types";
import { generateId } from "@/lib/id";
import {
  addCustomCor,
  addCustomOcasiao,
  addCustomTipo,
  addPiece,
  getCustomCores,
  getCustomOcasioes,
  getCustomTipos,
} from "@/lib/storage";

const TIPOS_PADRAO: Tipo[] = ["Blusas", "Calças", "Sapatos", "Acessórios"];
const OCASIOES_PADRAO: Ocasiao[] = ["Casual", "Trabalho", "Festa chique", "Balada eletrônica"];
const ESTACOES: Estacao[] = ["Verão", "Inverno", "Outono", "Primavera", "Chuva"];
const CORES_PADRAO = [
  "#000000",
  "#FFFFFF",
  "#8E8E8E",
  "#D9C9A8",
  "#8B7355",
  "#C1694A",
  "#B23A48",
  "#D96C4E",
  "#E0B94F",
  "#5C7A54",
  "#3B4A63",
  "#6B4E71",
  "#262220",
];

export default function AdicionarPecaPage() {
  const router = useRouter();
  const [tipos, setTipos] = useState<Tipo[]>(() => [...TIPOS_PADRAO, ...getCustomTipos()]);
  const [ocasioesOpcoes, setOcasioesOpcoes] = useState<Ocasiao[]>(() => [
    ...OCASIOES_PADRAO,
    ...getCustomOcasioes(),
  ]);
  const [cores, setCores] = useState<string[]>(() => [...CORES_PADRAO, ...getCustomCores()]);

  const [tipo, setTipo] = useState<Tipo>(TIPOS_PADRAO[0]);
  const [ocasioes, setOcasioes] = useState<Ocasiao[]>([]);
  const [cor, setCor] = useState(CORES_PADRAO[0]);
  const [estacoes, setEstacoes] = useState<Estacao[]>([]);
  const [favorita, setFavorita] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [marca, setMarca] = useState("");
  const [notas, setNotas] = useState("");
  const [estampa, setEstampa] = useState("");

  function toggleOcasiao(o: Ocasiao) {
    setOcasioes((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  function toggleEstacao(e: Estacao) {
    setEstacoes((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  function handleNovoTipo(nome: string) {
    if (!nome.trim() || tipos.includes(nome.trim())) return;
    const novo = nome.trim();
    setTipos((prev) => [...prev, novo]);
    addCustomTipo(novo);
    setTipo(novo);
  }

  function handleNovaOcasiao(nome: string) {
    if (!nome.trim() || ocasioesOpcoes.includes(nome.trim())) return;
    const nova = nome.trim();
    setOcasioesOpcoes((prev) => [...prev, nova]);
    addCustomOcasiao(nova);
    setOcasioes((prev) => [...prev, nova]);
  }

  function handleNovaCor(novaCor: string) {
    if (cores.includes(novaCor)) {
      setCor(novaCor);
      return;
    }
    setCores((prev) => [...prev, novaCor]);
    addCustomCor(novaCor);
    setCor(novaCor);
  }

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const piece: Piece = {
      id: generateId(),
      tipo,
      ocasioes,
      cor,
      estacoes,
      favorita,
      marca: marca || undefined,
      notas: notas || undefined,
      estampa: estampa || undefined,
      criadaEm: new Date().toISOString(),
    };
    const { error } = await addPiece(piece);
    if (error) {
      setErro(error);
      setSalvando(false);
      return;
    }
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
          <ChipGroup options={tipos} selected={[tipo]} onToggle={(o) => setTipo(o)} />
          <AddChip placeholder="Novo tipo" onAdd={handleNovoTipo} />
        </Field>

        <Field label="Ocasião">
          <ChipGroup options={ocasioesOpcoes} selected={ocasioes} onToggle={toggleOcasiao} />
          <AddChip placeholder="Nova ocasião" onAdd={handleNovaOcasiao} />
        </Field>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {cores.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCor(c)}
                className={`h-9 w-9 rounded-full border-2 ${
                  cor === c ? "border-[var(--color-terracota)]" : "border-black/10"
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <label
              className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-black/20 text-black/40"
              aria-label="Adicionar cor"
            >
              <i className="fi-rr-plus-small text-sm" aria-hidden="true" />
              <input
                type="color"
                value={cor}
                onChange={(e) => handleNovaCor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </Field>

        <Field label="Estação">
          <ChipGroup options={ESTACOES} selected={estacoes} onToggle={(o) => toggleEstacao(o as Estacao)} />
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

        {erro && <p className="text-sm text-red-600">Erro ao salvar: {erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full rounded-full bg-[var(--color-terracota)] py-3 font-medium text-white disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar no armário"}
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

function AddChip({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");

  function confirmar() {
    onAdd(valor);
    setValor("");
    setAberto(false);
  }

  if (aberto) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmar();
            }
            if (e.key === "Escape") setAberto(false);
          }}
          placeholder={placeholder}
          className="flex-1 rounded-full border border-black/10 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={confirmar}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-terracota)] text-white"
          aria-label="Confirmar"
        >
          <i className="fi-rr-check text-xs" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-black/40"
          aria-label="Cancelar"
        >
          <i className="fi-rr-cross-small text-xs" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAberto(true)}
      className="mt-2 flex items-center gap-1 rounded-full border border-dashed border-black/20 px-3 py-1.5 text-sm text-black/50"
    >
      <i className="fi-rr-plus-small text-xs" aria-hidden="true" />
      Adicionar
    </button>
  );
}
