"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ocasiao, Peso, Piece, Tipo } from "@/lib/types";
import { generateId } from "@/lib/id";
import { supabase } from "@/lib/supabase";
import {
  addCustomCor,
  addCustomOcasiao,
  addCustomSubtipo,
  addCustomTipo,
  addPiece,
  getCustomCores,
  getCustomOcasioes,
  getCustomSubtipos,
  getCustomTipos,
} from "@/lib/storage";

const TIPOS_PADRAO: Tipo[] = [
  "Parte de cima",
  "Parte de baixo",
  "Vestidos",
  "Macacões",
  "Sapatos",
  "Bolsas",
  "Acessórios",
];

// Subtipos são o detalhe da peça dentro de cada categoria principal. A
// pessoa pode adicionar outros próprios além desses (guardados por tipo).
const SUBTIPOS_PADRAO: Record<string, string[]> = {
  "Parte de cima": ["Regata", "Cropped", "Tomara que caia", "Top", "Camiseta", "Blusa", "Camisa", "Blazer", "Casaco", "Tricô"],
  "Parte de baixo": ["Calça", "Saia", "Short", "Bermuda", "Legging"],
  "Vestidos": ["Curto", "Midi", "Longo"],
  "Macacões": ["Macacão longo", "Macacão curto", "Pantalona"],
  "Sapatos": ["Tênis", "Sandália", "Salto", "Bota", "Rasteirinha", "Chinelo"],
  "Bolsas": ["Bolsa de mão", "Mochila", "Carteira", "Transversal"],
  "Acessórios": ["Colar", "Brinco", "Cinto", "Óculos", "Chapéu", "Pulseira", "Anel"],
};

const OCASIOES_PADRAO: Ocasiao[] = ["Casual", "Trabalho", "Festa chique", "Balada eletrônica"];
const PESOS: Peso[] = ["Leve", "Neutra", "Quente"];
// Paleta enxuta de cores "guarda-chuva" — no MVP cada peça usa a cor básica
// mais próxima (ex: azul bebê e azul marinho caem ambos em "Azul"). Dá pra
// refinar isso depois; por enquanto evita a lista de cores crescer sem fim.
const CORES_PADRAO = [
  "#000000", // Preto
  "#FFFFFF", // Branco
  "#9CA3AF", // Cinza
  "#D9C9A8", // Bege
  "#8B7355", // Marrom
  "#B23A48", // Vermelho
  "#D9743E", // Laranja
  "#E0B94F", // Amarelo
  "#5C7A54", // Verde
  "#3B4A63", // Azul
  "#6B4E71", // Roxo
  "#C97B94", // Rosa
];

export default function AdicionarPecaPage() {
  const router = useRouter();
  const [tipos, setTipos] = useState<Tipo[]>(() => [...TIPOS_PADRAO, ...getCustomTipos()]);
  const [ocasioesOpcoes, setOcasioesOpcoes] = useState<Ocasiao[]>(() => [
    ...OCASIOES_PADRAO,
    ...getCustomOcasioes(),
  ]);
  const [paletaCores, setPaletaCores] = useState<string[]>(() => [...CORES_PADRAO, ...getCustomCores()]);

  const [tipo, setTipo] = useState<Tipo>(TIPOS_PADRAO[0]);
  const [subtipos, setSubtipos] = useState<string[]>([]);
  const [customSubtipos, setCustomSubtipos] = useState<Record<string, string[]>>(() => {
    const mapa: Record<string, string[]> = {};
    for (const t of TIPOS_PADRAO) mapa[t] = getCustomSubtipos(t);
    return mapa;
  });
  const [ocasioes, setOcasioes] = useState<Ocasiao[]>([]);
  const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([CORES_PADRAO[0]]);
  const [peso, setPeso] = useState<Peso | null>(null);
  const [favorita, setFavorita] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [marca, setMarca] = useState("");
  const [notas, setNotas] = useState("");
  const [estampa, setEstampa] = useState("");

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [sugerindoTags, setSugerindoTags] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);

  function toggleOcasiao(o: Ocasiao) {
    setOcasioes((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  function selecionarPeso(p: Peso) {
    setPeso((prev) => (prev === p ? null : p));
  }

  function selecionarTipo(novoTipo: Tipo) {
    setTipo(novoTipo);
    setSubtipos([]);
  }

  function handleNovoTipo(nome: string) {
    if (!nome.trim() || tipos.includes(nome.trim())) return;
    const novo = nome.trim();
    setTipos((prev) => [...prev, novo]);
    addCustomTipo(novo);
    setTipo(novo);
    setSubtipos([]);
  }

  function toggleSubtipo(s: string) {
    setSubtipos((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function handleNovoSubtipo(nome: string, tipoAlvo: string = tipo) {
    if (!nome.trim()) return;
    const novo = nome.trim();
    const opcoesAtuais = [...(SUBTIPOS_PADRAO[tipoAlvo] ?? []), ...(customSubtipos[tipoAlvo] ?? [])];
    if (!opcoesAtuais.includes(novo)) {
      setCustomSubtipos((prev) => ({ ...prev, [tipoAlvo]: [...(prev[tipoAlvo] ?? []), novo] }));
      addCustomSubtipo(tipoAlvo, novo);
    }
    setSubtipos((prev) => (prev.includes(novo) ? prev : [...prev, novo]));
  }

  function handleNovaOcasiao(nome: string) {
    if (!nome.trim() || ocasioesOpcoes.includes(nome.trim())) return;
    const nova = nome.trim();
    setOcasioesOpcoes((prev) => [...prev, nova]);
    addCustomOcasiao(nova);
    setOcasioes((prev) => [...prev, nova]);
  }

  function toggleCor(c: string) {
    setCoresSelecionadas((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  }

  function handleNovaCor(novaCor: string) {
    if (!paletaCores.includes(novaCor)) {
      setPaletaCores((prev) => [...prev, novaCor]);
      addCustomCor(novaCor);
    }
    setCoresSelecionadas((prev) => (prev.includes(novaCor) ? prev : [...prev, novaCor]));
  }

  // A cor detectada na foto quase nunca bate exatamente com uma cor da
  // paleta — em vez de criar uma cor nova pra cada peça (o que fazia a
  // lista crescer sem parar), escolhemos a cor "guarda-chuva" mais parecida.
  function corMaisProxima(hex: string): string {
    const r1 = parseInt(hex.slice(1, 3), 16);
    const g1 = parseInt(hex.slice(3, 5), 16);
    const b1 = parseInt(hex.slice(5, 7), 16);
    let melhor = CORES_PADRAO[0];
    let menorDistancia = Infinity;
    for (const candidata of CORES_PADRAO) {
      const r2 = parseInt(candidata.slice(1, 3), 16);
      const g2 = parseInt(candidata.slice(3, 5), 16);
      const b2 = parseInt(candidata.slice(5, 7), 16);
      const distancia = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        melhor = candidata;
      }
    }
    return melhor;
  }

  function aplicarCorDetectada(hex: string) {
    const maisProxima = corMaisProxima(hex);
    setCoresSelecionadas((prev) => (prev.includes(maisProxima) ? prev : [...prev, maisProxima]));
  }

  async function converterParaJpeg(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);

    // Fotos de celular costumam vir enormes (10-15MB), o que deixa o upload e
    // o processamento da IA bem mais lentos sem ganho real de qualidade pro
    // nosso caso. Redimensionamos pro lado maior ter no máximo 1600px.
    const MAIOR_LADO_MAX = 1600;
    const escala = Math.min(1, MAIOR_LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a imagem.");
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter imagem."))),
        "image/jpeg",
        0.85
      );
    });
  }

  async function normalizarEnquadramento(url: string): Promise<Blob | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar imagem processada."));
        img.src = url;
      });

      const canvasOriginal = document.createElement("canvas");
      canvasOriginal.width = img.naturalWidth;
      canvasOriginal.height = img.naturalHeight;
      const ctxOriginal = canvasOriginal.getContext("2d");
      if (!ctxOriginal) return null;
      ctxOriginal.drawImage(img, 0, 0);

      // Detecta os limites reais da peça numa amostra reduzida (mais rápido),
      // depois converte de volta pra escala da imagem original.
      const AMOSTRA_MAX = 400;
      const escalaAmostra = Math.min(1, AMOSTRA_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const larguraAmostra = Math.round(img.naturalWidth * escalaAmostra);
      const alturaAmostra = Math.round(img.naturalHeight * escalaAmostra);
      const canvasAmostra = document.createElement("canvas");
      canvasAmostra.width = larguraAmostra;
      canvasAmostra.height = alturaAmostra;
      const ctxAmostra = canvasAmostra.getContext("2d");
      if (!ctxAmostra) return null;
      ctxAmostra.drawImage(img, 0, 0, larguraAmostra, alturaAmostra);
      const amostra = ctxAmostra.getImageData(0, 0, larguraAmostra, alturaAmostra);

      let minX = larguraAmostra;
      let minY = alturaAmostra;
      let maxX = 0;
      let maxY = 0;
      let encontrouPeca = false;

      for (let y = 0; y < alturaAmostra; y++) {
        for (let x = 0; x < larguraAmostra; x++) {
          const i = (y * larguraAmostra + x) * 4;
          const r = amostra.data[i];
          const g = amostra.data[i + 1];
          const b = amostra.data[i + 2];
          const a = amostra.data[i + 3];
          const quaseBranco = r > 240 && g > 240 && b > 240;
          const transparente = a < 200;
          if (!quaseBranco && !transparente) {
            encontrouPeca = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!encontrouPeca) return null;

      const fatorVolta = 1 / escalaAmostra;
      const bx = Math.floor(minX * fatorVolta);
      const by = Math.floor(minY * fatorVolta);
      const bLargura = Math.ceil((maxX - minX) * fatorVolta);
      const bAltura = Math.ceil((maxY - minY) * fatorVolta);

      const MARGEM = 0.14; // 14% de espaço em branco ao redor da peça, igual pra todas as fotos
      const paddingX = bLargura * MARGEM;
      const paddingY = bAltura * MARGEM;

      const canvasFinal = document.createElement("canvas");
      canvasFinal.width = Math.round(bLargura + paddingX * 2);
      canvasFinal.height = Math.round(bAltura + paddingY * 2);
      const ctxFinal = canvasFinal.getContext("2d");
      if (!ctxFinal) return null;
      ctxFinal.fillStyle = "#FFFFFF";
      ctxFinal.fillRect(0, 0, canvasFinal.width, canvasFinal.height);
      ctxFinal.drawImage(
        canvasOriginal,
        bx,
        by,
        bLargura,
        bAltura,
        Math.round(paddingX),
        Math.round(paddingY),
        bLargura,
        bAltura
      );

      return new Promise((resolve) => {
        canvasFinal.toBlob((blob) => resolve(blob), "image/png");
      });
    } catch (err) {
      console.error("Erro ao normalizar enquadramento:", err);
      return null;
    }
  }

  async function extrairCorPredominante(url: string): Promise<string | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar imagem processada."));
        img.src = url;
      });

      const TAMANHO = 80;
      const canvas = document.createElement("canvas");
      canvas.width = TAMANHO;
      canvas.height = TAMANHO;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, TAMANHO, TAMANHO);
      const { data } = ctx.getImageData(0, 0, TAMANHO, TAMANHO);

      let r = 0;
      let g = 0;
      let b = 0;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        const [pr, pg, pb, pa] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        // Ignora fundo branco/transparente (o efeito vitrine deixa a peça
        // isolada num fundo claro) pra não distorcer a média com o fundo.
        const quaseBranco = pr > 235 && pg > 235 && pb > 235;
        const transparente = pa < 200;
        if (quaseBranco || transparente) continue;
        r += pr;
        g += pg;
        b += pb;
        total++;
      }

      if (total === 0) return null;
      const hex = (v: number) =>
        Math.round(v / total)
          .toString(16)
          .padStart(2, "0");
      return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
    } catch (err) {
      console.error("Erro ao extrair cor predominante:", err);
      return null;
    }
  }

  async function handleSugerirTags(url: string) {
    setSugerindoTags(true);
    setErroSugestao(null);
    try {
      const subtiposConhecidos: Record<string, string[]> = {};
      for (const t of tipos) {
        subtiposConhecidos[t] = [...(SUBTIPOS_PADRAO[t] ?? []), ...(customSubtipos[t] ?? [])];
      }
      const res = await fetch("/api/sugerir-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fotoUrl: url,
          tiposPrincipais: tipos,
          subtiposConhecidos,
          ocasioes: ocasioesOpcoes,
        }),
      });
      if (!res.ok) {
        const dataErro = await res.json().catch(() => null);
        setErroSugestao(
          dataErro?.error || "Não consegui sugerir automaticamente, mas você pode preencher na mão."
        );
        return;
      }
      const sugestao = await res.json();

      let tipoFinal = tipo;
      if (sugestao.tipo) {
        tipoFinal = sugestao.tipo;
        selecionarTipo(sugestao.tipo);
      }

      if (Array.isArray(sugestao.subtipos)) {
        for (const s of sugestao.subtipos as string[]) {
          handleNovoSubtipo(s, tipoFinal);
        }
      }

      if (Array.isArray(sugestao.ocasioes)) {
        for (const o of sugestao.ocasioes as string[]) {
          if (ocasioesOpcoes.includes(o)) {
            setOcasioes((prev) => (prev.includes(o) ? prev : [...prev, o]));
          } else {
            handleNovaOcasiao(o);
          }
        }
      }

      if (typeof sugestao.peso === "string" && PESOS.includes(sugestao.peso as Peso)) {
        setPeso(sugestao.peso as Peso);
      }
    } catch (err) {
      console.error("Erro ao sugerir tags:", err);
      setErroSugestao("Não consegui sugerir automaticamente, mas você pode preencher na mão.");
    } finally {
      setSugerindoTags(false);
    }
  }

  async function handleFotoSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErroFoto(null);
    setFotoUrl(null);
    setFotoPreview(URL.createObjectURL(file));
    setProcessandoFoto(true);

    try {
      // Fotos de celular (ex: HEIC do iPhone) não são aceitas pela Photoroom,
      // então convertemos tudo pra JPEG antes de enviar.
      const jpeg = await converterParaJpeg(file);
      const formData = new FormData();
      formData.append("imageFile", jpeg, "peca.jpg");
      const res = await fetch("/api/remover-fundo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setErroFoto(data.error || "Não foi possível processar a foto.");
      } else {
        let urlFinal = data.url;
        const enquadrada = await normalizarEnquadramento(data.url);
        if (enquadrada) {
          const nomeArquivo = `${generateId()}.png`;
          const { error: uploadError } = await supabase.storage
            .from("fotos-pecas")
            .upload(nomeArquivo, enquadrada, { contentType: "image/png" });
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("fotos-pecas")
              .getPublicUrl(nomeArquivo);
            urlFinal = publicUrlData.publicUrl;
          }
        }
        setFotoUrl(urlFinal);
        const corDetectada = await extrairCorPredominante(urlFinal);
        if (corDetectada) {
          aplicarCorDetectada(corDetectada);
        }
        handleSugerirTags(urlFinal);
      }
    } catch (err) {
      console.error(err);
      setErroFoto("Não foi possível processar a foto. Verifique sua conexão.");
    } finally {
      setProcessandoFoto(false);
    }
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
      subtipos: subtipos.length > 0 ? subtipos : undefined,
      ocasioes,
      cores: coresSelecionadas,
      peso: peso ?? undefined,
      favorita,
      marca: marca || undefined,
      notas: notas || undefined,
      estampa: estampa || undefined,
      fotoUrl: fotoUrl || undefined,
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
        <p className="text-xs uppercase tracking-wide text-black/40">Nova peça</p>
        <h1 className="font-[var(--font-display)] text-2xl">Adicionar peça</h1>
        <p className="mt-1 text-sm text-black/50">
          Tire uma foto da peça — a gente remove o fundo e dá um efeito de vitrine
          automaticamente.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          {fotoPreview ? (
            <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl ?? fotoPreview}
                alt="Prévia da peça"
                className="h-full w-full object-contain"
              />
              {processandoFoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-black/60">
                  Removendo fundo e ajustando a peça…
                </div>
              )}
              <label className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">
                Trocar foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoSelecionada}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 text-sm text-black/40">
              <i className="fi-rr-camera text-xl" aria-hidden="true" />
              Adicionar foto da peça
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoSelecionada}
                className="hidden"
              />
            </label>
          )}
          {erroFoto && <p className="mt-2 text-sm text-red-600">{erroFoto}</p>}
          {sugerindoTags && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-black/60">
              <i className="fi-rr-sparkles text-xs" aria-hidden="true" />
              Sugerindo tipo, ocasião e peso com IA…
            </p>
          )}
          {erroSugestao && (
            <p className="mt-2 text-sm text-black/40">{erroSugestao}</p>
          )}
        </div>

        <Field label="Tipo">
          <CampoChips
            options={tipos}
            selected={[tipo]}
            onToggle={(o) => selecionarTipo(o)}
            addPlaceholder="Novo tipo"
            onAdd={handleNovoTipo}
          />
        </Field>

        {(SUBTIPOS_PADRAO[tipo] || customSubtipos[tipo]) && (
          <Field label="Subtipo">
            <CampoChips
              options={[...(SUBTIPOS_PADRAO[tipo] ?? []), ...(customSubtipos[tipo] ?? [])]}
              selected={subtipos}
              onToggle={toggleSubtipo}
              addPlaceholder="Novo subtipo"
              onAdd={(nome) => handleNovoSubtipo(nome)}
            />
          </Field>
        )}

        <Field label="Ocasião">
          <CampoChips
            options={ocasioesOpcoes}
            selected={ocasioes}
            onToggle={toggleOcasiao}
            addPlaceholder="Nova ocasião"
            onAdd={handleNovaOcasiao}
          />
        </Field>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {paletaCores.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleCor(c)}
                className={`h-9 w-9 rounded-full border border-black/15 ${
                  coresSelecionadas.includes(c)
                    ? "ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-paper)]"
                    : ""
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
                value={coresSelecionadas[coresSelecionadas.length - 1] ?? paletaCores[0]}
                onChange={(e) => handleNovaCor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </Field>

        <Field label="Peso da peça">
          <div className="flex flex-wrap gap-2">
            {PESOS.map((p) => {
              const ativo = peso === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => selecionarPeso(p)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    ativo
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                      : "border-black/10 text-black/60"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Field>

        <label className="flex items-center justify-between rounded-2xl border border-black/10 px-4 py-3">
          <span className="text-sm font-medium">Favorita</span>
          <input
            type="checkbox"
            checked={favorita}
            onChange={(e) => setFavorita(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-ink)]"
          />
        </label>

        <button
          type="button"
          onClick={() => setDetalhesAbertos((v) => !v)}
          className="text-sm font-medium text-black"
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
          disabled={salvando || processandoFoto}
          className="w-full rounded-full bg-[var(--color-lime)] py-3 font-medium text-[var(--color-ink)] disabled:opacity-60"
        >
          {salvando ? "Salvando..." : processandoFoto ? "Aguarde a foto..." : "Salvar no armário"}
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

// Altura aproximada de 3 linhas de chips (chip ~34px + 8px de espaço entre
// linhas). Usado pra limitar Tipo, Subtipo e Ocasião a no máximo 3 linhas,
// com um "+ mais" pra revelar o resto quando não cabe.
const ALTURA_TRES_LINHAS = 120;

function CampoChips({
  options,
  selected,
  onToggle,
  addPlaceholder,
  onAdd,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  addPlaceholder: string;
  onAdd: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [passaDe3Linhas, setPassaDe3Linhas] = useState(false);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setPassaDe3Linhas(el.scrollHeight > ALTURA_TRES_LINHAS + 2);
  }, [options, selected]);

  return (
    <div>
      <div
        ref={containerRef}
        className="flex flex-wrap gap-2 overflow-hidden"
        style={{ maxHeight: expandido ? undefined : ALTURA_TRES_LINHAS }}
      >
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                active
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                  : "border-black/10 text-black/60"
              }`}
            >
              {option}
            </button>
          );
        })}
        <AddChipInline placeholder={addPlaceholder} onAdd={onAdd} onAbrir={() => setExpandido(true)} />
      </div>
      {passaDe3Linhas && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-2 text-sm font-medium text-black"
        >
          {expandido ? "− ver menos" : "+ mais"}
        </button>
      )}
    </div>
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
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
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

function AddChipInline({
  placeholder,
  onAdd,
  onAbrir,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
  onAbrir?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");

  function abrir() {
    setAberto(true);
    onAbrir?.();
  }

  function confirmar() {
    onAdd(valor);
    setValor("");
    setAberto(false);
  }

  if (aberto) {
    return (
      <div className="flex items-center gap-2">
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
          className="rounded-full border border-black/10 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={confirmar}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-lime)] text-[var(--color-ink)]"
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
      onClick={abrir}
      className="flex items-center gap-1 rounded-full border border-dashed border-black/20 px-3 py-1.5 text-sm text-black/50"
    >
      <i className="fi-rr-plus-small text-xs" aria-hidden="true" />
      Adicionar
    </button>
  );
}
