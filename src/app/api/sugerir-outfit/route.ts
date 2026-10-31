import { NextRequest, NextResponse } from "next/server";
import { dentroDoLimiteVisitante, donaDaRequisicao } from "@/lib/auth-servidor";

const LIMITE_VISITANTE_POR_DIA = 5;

type PecaResumo = {
  id: string;
  tipo: string;
  subtipos: string[];
  ocasioes: string[];
  cores: string[];
  peso?: string;
  marca?: string;
  estampa?: string;
  favorita: boolean;
};

function pecaParaTexto(p: PecaResumo): string {
  const partes = [
    `id: ${p.id}`,
    `tipo: ${p.tipo}`,
    p.subtipos.length ? `subtipos: ${p.subtipos.join(", ")}` : null,
    p.ocasioes.length ? `ocasioes: ${p.ocasioes.join(", ")}` : null,
    p.cores.length ? `cores: ${p.cores.join(", ")}` : null,
    p.peso ? `peso: ${p.peso}` : null,
    p.marca ? `marca: ${p.marca}` : null,
    p.estampa ? `estampa: ${p.estampa}` : null,
    p.favorita ? "favorita: sim" : null,
  ].filter(Boolean);
  return `- {${partes.join(" | ")}}`;
}

async function chamarClaude(apiKey: string, prompt: string, maxTokens: number) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Erro na API da Anthropic:", errText);
    throw new Error("anthropic-error");
  }
  const data = await res.json();
  const texto: string = data?.content?.[0]?.text ?? "";
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("formato-inesperado");
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chave da IA não configurada no servidor." }, { status: 500 });
  }

  // Visitantes (sem login) podem testar o Stylist, com limite por dia.
  if (!(await donaDaRequisicao(req))) {
    const ok = await dentroDoLimiteVisitante(req, "stylist", LIMITE_VISITANTE_POR_DIA);
    if (!ok) {
      return NextResponse.json(
        { error: `Modo demonstração: você já usou as ${LIMITE_VISITANTE_POR_DIA} sugestões de hoje. Volte amanhã!` },
        { status: 429 }
      );
    }
  }

  const body = await req.json().catch(() => null);
  const modo = body?.modo === "trocar" ? "trocar" : "sugestoes";
  const pecas = Array.isArray(body?.pecas) ? (body.pecas as PecaResumo[]) : [];

  if (pecas.length === 0) {
    return NextResponse.json({ error: "Nenhuma peça com foto cadastrada ainda." }, { status: 400 });
  }

  const listaPecas = pecas.map(pecaParaTexto).join("\n");

  try {
    if (modo === "trocar") {
      const pecaIdsAtuais = Array.isArray(body?.pecaIdsAtuais) ? (body.pecaIdsAtuais as string[]) : [];
      const pecaIdParaTrocar = body?.pecaIdParaTrocar as string | undefined;
      if (!pecaIdParaTrocar) {
        return NextResponse.json({ error: "pecaIdParaTrocar é obrigatório." }, { status: 400 });
      }
      const outrasNoLook = pecaIdsAtuais.filter((id) => id !== pecaIdParaTrocar);

      const prompt =
        "Você é uma consultora de estilo pessoal. A pessoa já tem um look montado com peças do próprio " +
        "armário (nunca sugira comprar peças novas) e quer trocar UMA peça específica por outra do " +
        "armário que combine melhor ou dê mais variedade, mantendo o resto do look.\n\n" +
        `Peça a ser trocada: id ${pecaIdParaTrocar}.\n` +
        `Outras peças que continuam no look (não pode repetir nenhuma delas): ${outrasNoLook.join(", ") || "nenhuma"}.\n\n` +
        "Armário completo disponível:\n" +
        `${listaPecas}\n\n` +
        "Escolha UMA peça substituta que:\n" +
        "- não seja a peça atual nem nenhuma das outras que já estão no look;\n" +
        "- combine esteticamente (cor, ocasião, peso) com as outras peças do look;\n" +
        "- prefira, quando possível, o mesmo tipo/categoria da peça trocada, mas pode ser de tipo " +
        "diferente se isso resultar numa combinação melhor.\n\n" +
        "Responda APENAS com um JSON válido, sem texto antes ou depois, no formato:\n" +
        '{"pecaId": "id-da-peca-escolhida"}\n' +
        "Se nenhuma peça do armário servir como substituta razoável, responda com:\n" +
        '{"pecaId": null}';

      const resultado = await chamarClaude(apiKey, prompt, 200);
      const pecaId =
        typeof resultado.pecaId === "string" && pecas.some((p) => p.id === resultado.pecaId)
          ? resultado.pecaId
          : null;
      return NextResponse.json({ pecaId });
    }

    // modo "sugestoes"
    const ocasiao = typeof body?.ocasiao === "string" && body.ocasiao ? body.ocasiao : null;
    const peso = typeof body?.peso === "string" && body.peso ? body.peso : null;
    const pedidoLivre = typeof body?.pedidoLivre === "string" ? body.pedidoLivre.trim() : "";
    const quantidade = Math.min(Math.max(Number(body?.quantidade) || 3, 1), 4);

    const filtros = [
      ocasiao ? `Ocasião pedida: ${ocasiao}.` : null,
      peso ? `Peso da roupa pedido: ${peso}.` : null,
      pedidoLivre ? `Pedido em texto livre da pessoa: "${pedidoLivre}".` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const prompt =
      "Você é uma consultora de estilo pessoal ajudando a montar looks usando SOMENTE peças que a " +
      "pessoa já tem no armário abaixo (nunca sugira comprar peças novas).\n\n" +
      "Armário disponível:\n" +
      `${listaPecas}\n\n` +
      (filtros
        ? `${filtros}\n\n`
        : "Nenhum filtro específico foi pedido — monte sugestões variadas e coerentes para o dia a dia.\n\n") +
      `Monte até ${quantidade} sugestões de outfit DIFERENTES entre si. Cada sugestão deve, sempre que o ` +
      "armário permitir, combinar peças de categorias complementares (ex: parte de cima + parte de baixo, " +
      "ou um vestido/macacão sozinho, mais opcionalmente sapato e/ou acessório) que façam sentido juntas em " +
      "cor, ocasião e peso. Evite repetir a mesma peça em mais de uma sugestão quando o armário tiver " +
      "variedade suficiente, mas priorize sempre combinações que façam sentido esteticamente, mesmo que " +
      "isso signifique repetir alguma peça. Se o armário não tiver peças suficientes ou compatíveis com o " +
      "pedido, retorne menos sugestões (inclusive zero).\n\n" +
      "Responda APENAS com um JSON válido, sem texto antes ou depois, no formato:\n" +
      '{"sugestoes": [{"pecaIds": ["id1", "id2"], "nome": "nome curto do look", "observacao": "frase curta em português explicando o look"}]}\n' +
      "O campo nome deve ter de 2 a 4 palavras, em português, como um título de look (ex: \"Trabalho em azul\", " +
      "\"Noite de festa\", \"Casual com couro\"). Não descreva cores das peças no nome se não tiver certeza delas.";

    const resultado = await chamarClaude(apiKey, prompt, 900);
    const idsValidos = new Set(pecas.map((p) => p.id));
    const sugestoesBrutas = Array.isArray(resultado.sugestoes) ? resultado.sugestoes : [];
    const sugestoes = sugestoesBrutas
      .map((s: unknown) => {
        if (!s || typeof s !== "object") return null;
        const obj = s as { pecaIds?: unknown; observacao?: unknown; nome?: unknown };
        const pecaIds = Array.isArray(obj.pecaIds)
          ? obj.pecaIds.filter((id): id is string => typeof id === "string" && idsValidos.has(id))
          : [];
        if (pecaIds.length === 0) return null;
        return {
          pecaIds,
          nome: typeof obj.nome === "string" ? obj.nome.trim().slice(0, 40) : "",
          observacao: typeof obj.observacao === "string" ? obj.observacao : "",
        };
      })
      .filter((s: unknown): s is { pecaIds: string[]; nome: string; observacao: string } => s !== null);

    return NextResponse.json({ sugestoes });
  } catch (err) {
    console.error("Erro ao sugerir outfit:", err);
    return NextResponse.json({ error: "Não foi possível gerar sugestões agora." }, { status: 500 });
  }
}
