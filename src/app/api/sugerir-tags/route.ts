import { NextRequest, NextResponse } from "next/server";

const PESOS_VALIDOS = ["Leve", "Neutra", "Quente"];

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave da IA não configurada no servidor." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const fotoUrl = body?.fotoUrl as string | undefined;
  const tiposPrincipais = Array.isArray(body?.tiposPrincipais) ? (body.tiposPrincipais as string[]) : [];
  const subtiposConhecidos =
    body?.subtiposConhecidos && typeof body.subtiposConhecidos === "object"
      ? (body.subtiposConhecidos as Record<string, string[]>)
      : {};
  const ocasioes = Array.isArray(body?.ocasioes) ? (body.ocasioes as string[]) : [];

  if (!fotoUrl) {
    return NextResponse.json({ error: "fotoUrl é obrigatória." }, { status: 400 });
  }

  try {
    // Busca a imagem já processada (fundo removido) e converte pra base64,
    // que é o formato que a API da Anthropic espera pra visão.
    const imagemRes = await fetch(fotoUrl);
    if (!imagemRes.ok) {
      return NextResponse.json({ error: "Não foi possível carregar a foto." }, { status: 502 });
    }
    const contentType = imagemRes.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await imagemRes.arrayBuffer());
    const base64 = buffer.toString("base64");

    const subtiposTexto = Object.entries(subtiposConhecidos)
      .map(([tipo, lista]) => `  - ${tipo}: ${lista.length ? lista.join(", ") : "(nenhum subtipo ainda)"}`)
      .join("\n");

    const prompt =
      "Você está ajudando a organizar um armário digital. Olhe a foto da peça de roupa " +
      "(fundo já removido, efeito vitrine) e sugira como categorizá-la.\n\n" +
      `Categorias principais (tipo) disponíveis: ${tiposPrincipais.join(", ")}.\n` +
      "Subtipos (detalhe) já usados por essa pessoa em cada categoria:\n" +
      `${subtiposTexto || "  (nenhum subtipo ainda)"}\n\n` +
      `Ocasiões já usadas por essa pessoa: ${ocasioes.length ? ocasioes.join(", ") : "nenhuma ainda"}.\n\n` +
      "Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, no formato:\n" +
      '{"tipo": "string", "subtipos": ["string", ...], "ocasioes": ["string", ...], "peso": "string"}\n\n' +
      "Regras:\n" +
      "- tipo: escolha OBRIGATORIAMENTE uma das categorias principais listadas acima (nunca invente uma nova aqui).\n" +
      "- subtipos: uma LISTA com o(s) detalhe(s) da peça dentro dessa categoria (ex: Regata, Cropped, " +
      "Tomara que caia, Blazer, Calça, Saia, Tênis, Sandália, Colar, Bolsa de mão etc). Pode incluir mais " +
      "de um se fizer sentido (ex: um casaco de tricô pode ser [\"Casaco\", \"Tricô\"]). Prefira " +
      "reaproveitar subtipos já usados nessa mesma categoria. Se nenhum combinar, pode sugerir um novo, " +
      "curto, em português. Se não der pra identificar nenhum, retorne uma lista vazia.\n" +
      "- ocasioes: prefira reaproveitar ocasiões já usadas quando fizer sentido. Pode sugerir mais de uma, " +
      "ou uma nova se nenhuma existente combinar. Nunca deixe vazio se for possível inferir algo razoável.\n" +
      `- peso: escolha somente um destes valores exatos: ${PESOS_VALIDOS.join(", ")}. ` +
      "\"Leve\" pra tecidos finos/arejados (linho, viscose, regata), \"Quente\" pra peças que esquentam " +
      "mais (moletom, jaqueta, tricô grosso, casaco), e \"Neutra\" pro meio-termo ou quando não der " +
      "pra saber pelo tecido (ex: acessórios, bolsas, sapatos).";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: contentType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Erro na API da Anthropic:", errText);
      return NextResponse.json(
        { error: "Não foi possível analisar a foto agora." },
        { status: 502 }
      );
    }

    const anthropicData = await anthropicRes.json();
    const textoResposta: string = anthropicData?.content?.[0]?.text ?? "";

    // Garante que pegamos só o bloco JSON, mesmo que o modelo escreva algo a mais.
    const match = textoResposta.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Resposta da IA em formato inesperado." }, { status: 502 });
    }

    const sugestao = JSON.parse(match[0]);

    const tipoSugerido =
      typeof sugestao.tipo === "string" && tiposPrincipais.includes(sugestao.tipo.trim())
        ? sugestao.tipo.trim()
        : null;
    const subtiposSugeridos = Array.isArray(sugestao.subtipos)
      ? sugestao.subtipos.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
    const ocasioesSugeridas = Array.isArray(sugestao.ocasioes)
      ? sugestao.ocasioes.filter((o: unknown): o is string => typeof o === "string" && o.trim().length > 0)
      : [];
    const pesoSugerido =
      typeof sugestao.peso === "string" && PESOS_VALIDOS.includes(sugestao.peso) ? sugestao.peso : null;

    return NextResponse.json({
      tipo: tipoSugerido,
      subtipos: subtiposSugeridos,
      ocasioes: ocasioesSugeridas,
      peso: pesoSugerido,
    });
  } catch (err) {
    console.error("Erro ao sugerir tags:", err);
    return NextResponse.json({ error: "Não foi possível analisar a foto agora." }, { status: 500 });
  }
}
