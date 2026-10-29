"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ocasiao, Peso, Piece, Tipo } from "@/lib/types";
import { generateId } from "@/lib/id";
import { supabase } from "@/lib/supabase";
import { CORES, HEX_PADRAO, corMaisProximaDaPaleta, estiloSwatch, hexDoNome, nomeDaCor } from "@/lib/cores";
import {
  addCustomCor,
  limparCustomCores,
  addCustomOcasiao,
  addCustomSubtipo,
  addCustomTipo,
  addPiece,
  getPieceById,
  getPieces,
  updatePiece,
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
const CORES_PADRAO = HEX_PADRAO;

export default function AdicionarPecaPage() {
  // useSearchParams precisa de um Suspense em volta no Next.js.
  return (
    <Suspense fallback={null}>
      <AdicionarPecaConteudo />
    </Suspense>
  );
}

function AdicionarPecaConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tipos, setTipos] = useState<Tipo[]>(() => [...TIPOS_PADRAO, ...getCustomTipos()]);
  const [ocasioesOpcoes, setOcasioesOpcoes] = useState<Ocasiao[]>(() => [
    ...OCASIOES_PADRAO,
    ...getCustomOcasioes(),
  ]);
  const [paletaCores, setPaletaCores] = useState<string[]>(() => [...CORES_PADRAO, ...getCustomCores()]);

  // Começa sem tipo marcado: se a IA falhar, a pessoa percebe e escolhe,
  // em vez de a peça ser salva como "Parte de cima" sem ninguém notar.
  const [tipo, setTipo] = useState<Tipo>("");

  // Modo edição: /adicionar?editar=<id> reaproveita esta mesma tela.
  const editandoId = searchParams.get("editar");
  const [criadaEmOriginal, setCriadaEmOriginal] = useState<string | null>(null);
  const [pecaCarregada, setPecaCarregada] = useState(false);
  const carregandoPeca = !!editandoId && !pecaCarregada;
  const [subtipos, setSubtipos] = useState<string[]>([]);
  const [customSubtipos, setCustomSubtipos] = useState<Record<string, string[]>>(() => {
    const mapa: Record<string, string[]> = {};
    for (const t of TIPOS_PADRAO) mapa[t] = getCustomSubtipos(t);
    return mapa;
  });
  const [ocasioes, setOcasioes] = useState<Ocasiao[]>([]);
  // Nenhuma cor marcada por padrão (antes o Preto vinha marcado e ficava junto da cor detectada).
  const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([]);
  const [peso, setPeso] = useState<Peso | null>(null);
  const [favorita, setFavorita] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [marca, setMarca] = useState("");
  const [notas, setNotas] = useState("");
  const [estampa, setEstampa] = useState("");

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  // "A IA mudou a peça? Usar a foto real": guarda a foto original desta sessão e a
  // vitrine gerada, pra alternar entre a vitrine da IA e a foto real só sem fundo.
  const jpegOriginalRef = useRef<Blob | null>(null);
  const [temOriginalSessao, setTemOriginalSessao] = useState(false);
  const [urlOriginalSalva, setUrlOriginalSalva] = useState<string | null>(null);
  const [fotoVitrineUrl, setFotoVitrineUrl] = useState<string | null>(null);
  const [fotoRealUrl, setFotoRealUrl] = useState<string | null>(null);
  const [gerandoFotoReal, setGerandoFotoReal] = useState(false);
  // Qual serviço gerou a imagem ("producao" = vitrine Photoroom, "fal" = recorte fiel,
  // "sandbox" = Photoroom com marca d'água). Se já é o recorte fiel, não precisa
  // oferecer "usar a foto real".
  const [modoImagem, setModoImagem] = useState<string | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [sugerindoTags, setSugerindoTags] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);

  // Tipos, subtipos e ocasiões criados pela pessoa ficavam só no aparelho onde
  // foram criados (localStorage). Agora também lemos o que já existe nas peças
  // salvas no banco, então eles aparecem em qualquer aparelho.
  useEffect(() => {
    let ativo = true;
    getPieces().then((pecas) => {
      if (!ativo || pecas.length === 0) return;
      setTipos((prev) => {
        const novos = pecas.map((p) => p.tipo).filter((t) => t && !prev.includes(t));
        return novos.length ? [...prev, ...Array.from(new Set(novos))] : prev;
      });
      setCustomSubtipos((prev) => {
        const proximo = { ...prev };
        let mudou = false;
        for (const p of pecas) {
          for (const sub of p.subtipos ?? []) {
            const conhecidos = [...(SUBTIPOS_PADRAO[p.tipo] ?? []), ...(proximo[p.tipo] ?? [])];
            if (!conhecidos.includes(sub)) {
              proximo[p.tipo] = [...(proximo[p.tipo] ?? []), sub];
              mudou = true;
            }
          }
        }
        return mudou ? proximo : prev;
      });
      setOcasioesOpcoes((prev) => {
        const novas = pecas.flatMap((p) => p.ocasioes).filter((o) => o && !prev.includes(o));
        return novas.length ? [...prev, ...Array.from(new Set(novas))] : prev;
      });
    });
    return () => {
      ativo = false;
    };
  }, []);

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
    const cor = novaCor.toUpperCase();
    if (!paletaCores.some((c) => c.toUpperCase() === cor)) {
      addCustomCor(cor);
      setPaletaCores([...CORES_PADRAO, ...getCustomCores()]);
    }
    setCoresSelecionadas((prev) => (prev.includes(cor) ? prev : [...prev, cor]));
  }

  function handleLimparCoresPersonalizadas() {
    limparCustomCores();
    setPaletaCores([...CORES_PADRAO]);
    setCoresSelecionadas((prev) => prev.filter((c) => CORES_PADRAO.includes(c)));
  }

  // O seletor de cor do iPhone avisa a cada movimento do dedo no espectro.
  // Só adicionamos a cor quando o seletor fecha (evento "change" nativo), senão
  // cada tom intermediário virava uma cor nova na paleta.
  const corInputRef = useRef<HTMLInputElement>(null);
  const novaCorRef = useRef(handleNovaCor);
  useEffect(() => {
    novaCorRef.current = handleNovaCor;
  });
  useEffect(() => {
    const el = corInputRef.current;
    if (!el) return;
    const aoConfirmar = () => novaCorRef.current(el.value);
    el.addEventListener("change", aoConfirmar);
    return () => el.removeEventListener("change", aoConfirmar);
  }, []);

  // Plano B: a média de pixels só entra se nem a IA nem a pessoa escolheram uma cor.
  function aplicarCorDetectada(hex: string) {
    const maisProxima = corMaisProximaDaPaleta(hex);
    setCoresSelecionadas((prev) => (prev.length > 0 ? prev : [maisProxima]));
  }

  async function converterParaJpeg(file: Blob, maiorLado = 1600): Promise<Blob> {
    const bitmap = await createImageBitmap(file);

    // Fotos de celular costumam vir enormes (10-15MB), o que deixa o upload e
    // o processamento da IA bem mais lentos sem ganho real de qualidade pro
    // nosso caso. Redimensionamos pro lado maior ter no máximo 1600px.
    const MAIOR_LADO_MAX = maiorLado;
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

      // Foto final: no máximo 1200px no lado maior, em JPEG. Como a vitrine
      // tem fundo branco, não precisamos de PNG (que serve pra transparência).
      // Isso deixa cada foto ~10x mais leve (antes: 0,7–2,6 MB por peça), o
      // que acelera o cadastro no celular e o carregamento do Armário.
      const LADO_MAX_FINAL = 1200;
      const larguraTotal = bLargura + paddingX * 2;
      const alturaTotal = bAltura + paddingY * 2;
      const escalaFinal = Math.min(1, LADO_MAX_FINAL / Math.max(larguraTotal, alturaTotal));

      const canvasFinal = document.createElement("canvas");
      canvasFinal.width = Math.round(larguraTotal * escalaFinal);
      canvasFinal.height = Math.round(alturaTotal * escalaFinal);
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
        Math.round(paddingX * escalaFinal),
        Math.round(paddingY * escalaFinal),
        Math.round(bLargura * escalaFinal),
        Math.round(bAltura * escalaFinal)
      );

      return new Promise((resolve) => {
        canvasFinal.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
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

  function blobParaBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result).split(",")[1] ?? "");
      leitor.onerror = () => reject(new Error("Falha ao ler a imagem."));
      leitor.readAsDataURL(blob);
    });
  }

  async function handleSugerirTags(foto: Blob) {
    setSugerindoTags(true);
    setErroSugestao(null);
    try {
      const imagemBase64 = await blobParaBase64(foto);
      const subtiposConhecidos: Record<string, string[]> = {};
      for (const t of tipos) {
        subtiposConhecidos[t] = [...(SUBTIPOS_PADRAO[t] ?? []), ...(customSubtipos[t] ?? [])];
      }
      const res = await fetch("/api/sugerir-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagemBase64,
          mediaType: "image/jpeg",
          tiposPrincipais: tipos,
          coresDisponiveis: CORES.map((c) => c.nome),
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

      // Cores sugeridas pela IA (por nome) substituem qualquer palpite anterior.
      if (Array.isArray(sugestao.cores)) {
        const hexes = (sugestao.cores as string[])
          .map((n) => hexDoNome(n))
          .filter((h): h is string => !!h);
        if (hexes.length > 0) setCoresSelecionadas(Array.from(new Set(hexes)));
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

  // Endereço da foto original guardada (só existe pra peças cadastradas depois
  // que o app passou a guardar originais).
  function urlDaOriginal(url: string): string {
    return url.replace("/fotos-pecas/", "/fotos-pecas/originais/").replace(/\.png(\?.*)?$/, ".jpg");
  }

  // Na edição de uma peça, descobre se a foto original dela está guardada.
  useEffect(() => {
    if (!editandoId || !fotoUrl || jpegOriginalRef.current || fotoVitrineUrl) return;
    const original = urlDaOriginal(fotoUrl);
    fetch(original, { method: "HEAD" })
      .then((r) => {
        if (r.ok) {
          setUrlOriginalSalva(original);
          setFotoVitrineUrl(fotoUrl);
        }
      })
      .catch(() => {});
  }, [editandoId, fotoUrl, fotoVitrineUrl]);

  const temFotoOriginal = temOriginalSessao || !!urlOriginalSalva;

  // Refaz a imagem sem IA generativa: só tira o fundo da foto real e põe no
  // fundo branco. 100% fiel à peça (sem o efeito de manequim).
  async function usarFotoReal() {
    if (fotoRealUrl) {
      setFotoUrl(fotoRealUrl);
      return;
    }
    setGerandoFotoReal(true);
    setErroFoto(null);
    try {
      let original = urlOriginalSalva;
      if (!original && jpegOriginalRef.current) {
        const nome = `originais/${generateId()}.jpg`;
        const { error } = await supabase.storage
          .from("fotos-pecas")
          .upload(nome, jpegOriginalRef.current, { contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        original = supabase.storage.from("fotos-pecas").getPublicUrl(nome).data.publicUrl;
        setUrlOriginalSalva(original);
      }
      if (!original) throw new Error("Foto original não encontrada.");

      const res = await fetch("/api/remover-fundo-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoUrl: original }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok || !dados?.url) throw new Error(dados?.error || "Não consegui tirar o fundo agora.");

      const enquadrada = await normalizarEnquadramento(dados.url as string);
      if (!enquadrada) throw new Error("Não consegui ajustar a foto.");
      const nomeFinal = `${generateId()}.jpg`;
      const { error: erroUpload } = await supabase.storage
        .from("fotos-pecas")
        .upload(nomeFinal, enquadrada, { contentType: "image/jpeg" });
      if (erroUpload) throw new Error(erroUpload.message);
      const url = supabase.storage.from("fotos-pecas").getPublicUrl(nomeFinal).data.publicUrl;
      setFotoRealUrl(url);
      setFotoUrl(url);
    } catch (err) {
      console.error("Erro ao usar a foto real:", err);
      setErroFoto(err instanceof Error ? err.message : "Não consegui usar a foto real agora.");
    } finally {
      setGerandoFotoReal(false);
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
      jpegOriginalRef.current = jpeg;
      setTemOriginalSessao(true);
      setModoImagem(null);
      setFotoVitrineUrl(null);
      setFotoRealUrl(null);
      setUrlOriginalSalva(null);

      // A IA dos campos roda AO MESMO TEMPO que a Photoroom, usando a foto
      // original (menor, pra ir rápido). Antes ela só começava depois da
      // vitrine pronta, o que somava ~2-3s de espera parada.
      converterParaJpeg(file, 1024)
        .then((jpegPequeno) => handleSugerirTags(jpegPequeno))
        .catch((err) => console.error("Erro ao preparar foto pra IA:", err));
      const formData = new FormData();
      formData.append("imageFile", jpeg, "peca.jpg");
      const res = await fetch("/api/remover-fundo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErroFoto(data?.error || "Não foi possível processar a foto.");
      } else {
        // A vitrine chega direto do servidor; ajustamos a margem aqui no
        // celular e fazemos um único upload pro Supabase.
        setModoImagem(res.headers.get("X-Photoroom-Modo"));
        const vitrine = await res.blob();
        const enquadrada = await normalizarEnquadramento(URL.createObjectURL(vitrine));
        const fotoFinal = enquadrada ?? vitrine;
        const ehJpeg = fotoFinal.type === "image/jpeg";
        const nomeArquivo = `${generateId()}.${ehJpeg ? "jpg" : "png"}`;
        const { error: uploadError } = await supabase.storage
          .from("fotos-pecas")
          .upload(nomeArquivo, fotoFinal, { contentType: ehJpeg ? "image/jpeg" : "image/png" });
        if (uploadError) {
          setErroFoto(`Não consegui salvar a foto: ${uploadError.message}`);
        } else {
          // Guarda também a foto original (antes da vitrine), com o mesmo nome dentro
          // de "originais/". Assim dá pra refazer a vitrine no futuro sem fotografar de novo.
          supabase.storage
            .from("fotos-pecas")
            .upload(`originais/${nomeArquivo.replace(/\.png$/, ".jpg")}`, jpeg, { contentType: "image/jpeg" })
            .then(({ error }) => {
              if (error) console.error("Não consegui guardar a foto original:", error.message);
            });
          const { data: publicUrlData } = supabase.storage
            .from("fotos-pecas")
            .getPublicUrl(nomeArquivo);
          setFotoUrl(publicUrlData.publicUrl);
          setFotoVitrineUrl(publicUrlData.publicUrl);
          // A cor é lida da imagem que já está na memória do celular, sem baixar de novo.
          const corDetectada = await extrairCorPredominante(URL.createObjectURL(fotoFinal));
          if (corDetectada) {
            aplicarCorDetectada(corDetectada);
          }
        }
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

  useEffect(() => {
    if (!editandoId) return;
    getPieceById(editandoId).then((p) => {
      setPecaCarregada(true);
      if (!p) {
        setErro("Não encontrei essa peça.");
        return;
      }
      // Garante que as opções da peça aparecem como chips, mesmo que tenham
      // sido criadas em outro aparelho.
      setTipos((prev) => (prev.includes(p.tipo) ? prev : [...prev, p.tipo]));
      setTipo(p.tipo);
      const subs = p.subtipos ?? [];
      setCustomSubtipos((prev) => {
        const conhecidos = [...(SUBTIPOS_PADRAO[p.tipo] ?? []), ...(prev[p.tipo] ?? [])];
        const faltando = subs.filter((x) => !conhecidos.includes(x));
        return faltando.length ? { ...prev, [p.tipo]: [...(prev[p.tipo] ?? []), ...faltando] } : prev;
      });
      setSubtipos(subs);
      setOcasioesOpcoes((prev) => [...prev, ...p.ocasioes.filter((o) => !prev.includes(o))]);
      setOcasioes(p.ocasioes);
      setPaletaCores((prev) => [...prev, ...p.cores.filter((c) => !prev.includes(c))]);
      setCoresSelecionadas(p.cores);
      setPeso(p.peso ?? null);
      setFavorita(p.favorita);
      setMarca(p.marca ?? "");
      setNotas(p.notas ?? "");
      setEstampa(p.estampa ?? "");
      if (p.marca || p.notas || p.estampa) setDetalhesAbertos(true);
      if (p.fotoUrl) {
        setFotoUrl(p.fotoUrl);
        setFotoPreview(p.fotoUrl);
      }
      setCriadaEmOriginal(p.criadaEm);
    });
  }, [editandoId]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    if (!tipo) {
      setErro("Escolha o tipo da peça.");
      setSalvando(false);
      return;
    }
    const piece: Piece = {
      id: editandoId ?? generateId(),
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
      criadaEm: criadaEmOriginal ?? new Date().toISOString(),
    };
    const { error } = editandoId ? await updatePiece(piece) : await addPiece(piece);
    if (error) {
      setErro(error);
      setSalvando(false);
      return;
    }
    router.push(editandoId ? `/peca/${editandoId}` : "/");
  }

  return (
    <main className="px-4 pb-24 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-black/40">
          {editandoId ? "Sua peça" : "Nova peça"}
        </p>
        <h1 className="font-[var(--font-display)] text-2xl">
          {editandoId ? "Editar peça" : "Adicionar peça"}
        </h1>
        {editandoId ? (
          carregandoPeca && <p className="mt-1 text-sm text-black/50">Carregando…</p>
        ) : (
          <p className="mt-1 text-sm text-black/50">
            Tire uma foto da peça — a gente remove o fundo e dá um efeito de vitrine
            automaticamente.
          </p>
        )}
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
                <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs text-black/70 shadow-sm">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-lime)] ring-1 ring-black/20" />
                  Deixando com cara de vitrine…
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
          {fotoUrl && temFotoOriginal && !processandoFoto && modoImagem !== "recorte" && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs">
              {fotoUrl === fotoRealUrl ? (
                <>
                  <span className="text-black/50">Usando a foto real (só sem fundo)</span>
                  {fotoVitrineUrl && (
                    <button type="button" onClick={() => setFotoUrl(fotoVitrineUrl)} className="font-medium underline">
                      Voltar pra vitrine
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={usarFotoReal}
                  disabled={gerandoFotoReal}
                  className="rounded-full border border-black/15 px-3 py-1.5 font-medium text-black/70 disabled:opacity-60"
                >
                  {gerandoFotoReal ? "Tirando o fundo da foto real…" : "A IA mudou a peça? Usar a foto real"}
                </button>
              )}
            </div>
          )}
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
                style={estiloSwatch(c)}
                aria-label={nomeDaCor(c)}
                title={nomeDaCor(c)}
              />
            ))}
            <label
              className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-black/20 text-black/40"
              aria-label="Adicionar cor"
            >
              <i className="fi-rr-plus-small text-sm" aria-hidden="true" />
              <input
                ref={corInputRef}
                type="color"
                defaultValue="#C9A54C"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-black/50">
            {coresSelecionadas.length > 0
              ? coresSelecionadas.map(nomeDaCor).join(", ")
              : "Nenhuma cor escolhida"}
          </p>
          {paletaCores.length > CORES_PADRAO.length && (
            <button
              type="button"
              onClick={handleLimparCoresPersonalizadas}
              className="mt-1 text-xs text-black/40 underline"
            >
              Limpar cores personalizadas
            </button>
          )}
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
          disabled={salvando || processandoFoto || carregandoPeca || !tipo}
          className="w-full rounded-full bg-[var(--color-lime)] py-3 font-medium text-[var(--color-ink)] disabled:opacity-60"
        >
          {salvando
            ? "Salvando..."
            : processandoFoto
              ? "Finalizando a foto…"
              : !tipo
                ? "Escolha o tipo da peça"
                : editandoId
                  ? "Salvar alterações"
                  : "Salvar no armário"}
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
