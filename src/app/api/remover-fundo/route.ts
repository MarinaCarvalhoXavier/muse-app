import { NextRequest, NextResponse } from "next/server";

const PROMPT =
  "Give the main garment a natural worn look with real volume and depth. " +
  "The item must always appear shaped as if worn by an invisible person, never flat. " +
  "Present it front facing and straight, with a realistic fit that shows contours, " +
  "curves, and natural tension lines while keeping the wearer fully invisible. " +
  "Only the product should appear, floating. Use the most flattering perspective and " +
  "make the item look new with very sharp and clean resolution. Show only the main " +
  "subject on a plain white background. If the original product is flat, add natural " +
  "3D structure so it looks worn while keeping the wearer invisible. Remove wrinkles if any. " +
  "Exception: if the item is jewelry, a bag, shoes, a belt, glasses or another accessory, keep its " +
  "real shape and materials exactly as they are, do not turn it into clothing, and just present it " +
  "clean, centered and sharp on a plain white background. " +
  "Preserve the exact length, proportions, silhouette, cut and hemline of the original item: " +
  "never make it longer, shorter, wider or looser, and never change what kind of item it is " +
  "(short shorts stay short shorts, a cropped top stays cropped, a mini skirt stays mini).";

// Instrução pro fal.ai (Nano Banana / Nano Banana Pro). A foto pode ser da peça
// vestida (selfie no espelho), jogada na cama ou no cabide. A primeira versão desse
// prompt deixava o modelo "corrigir" a peça: alongou um short curto e desenhou um
// corpo. Agora a instrução diz que a pessoa deve sumir e que fidelidade vem antes.
const PROMPT_FAL =
  "Create a clean e-commerce ghost mannequin product photo of the main clothing item in this photo. " +
  "The photo may show the item worn by a person (for example a mirror selfie), lying on a bed, or on a hanger. " +
  "Remove the person completely: no skin, legs, arms, torso, hands, hair, phone, hanger or background. " +
  "Show only the garment, front facing, floating with natural 3D volume as if worn by an invisible person, " +
  "on a plain pure white background, sharp and well lit. " +
  "This is a catalog of the user's REAL clothes, so fidelity is the top priority: keep the exact same item, " +
  "with the same colors, fabric, prints, pockets, seams, buttons, logos and details. " +
  "Keep the exact length and proportions: the hem must end at the same point relative to the waistband as in the photo. " +
  "Never make it longer, shorter, wider or looser (very short shorts stay very short, a mini skirt stays mini, a cropped top stays cropped). " +
  "If it is jewelry, a bag, shoes, a belt, glasses or another accessory, keep its real shape and materials " +
  "exactly as they are, do not turn it into clothing, and just present it clean and centered on white.";

// Verificador: o Claude (visão) compara a foto original com a vitrine gerada e
// reprova só erros graves. Diferença pequena de detalhe passa (no teste, ser
// rígido demais reprovou um jeans que estava bom).
const PROMPT_VERIFICA =
  "Image 1 is the user's original photo of a real item (it may be worn by a person, lying on a bed or on a hanger). " +
  "Image 2 is an AI-generated catalog image that should show the SAME item alone on a white background. " +
  "Reject only serious problems. Answer only JSON: " +
  '{"corpo_ou_pele": boolean (true if image 2 shows any skin, body parts, a visible mannequin, hands or a person), ' +
  '"mesmo_tipo": boolean (same kind of item, e.g. shorts stay shorts, a ring stays a ring), ' +
  '"comprimento": "igual" | "mais_longo" | "mais_curto" (clearly different length relative to the item\'s own width; small variations count as "igual"), ' +
  '"cor_diferente": boolean (main color clearly different), ' +
  '"detalhes_diferentes": string[] (short list of visible differences, informative only), ' +
  '"aprovado": boolean (true unless corpo_ou_pele, not mesmo_tipo, comprimento not "igual" or cor_diferente)}';

// Ordem de tentativa pra gerar a vitrine (cada vitrine gerada passa pelo verificador):
// 1. Photoroom com chave de produção (sem marca d'água, 10 grátis por mês);
// 2. fal.ai Nano Banana (~US$ 0,04, ~9 s);
// 3. fal.ai Nano Banana Pro (~US$ 0,15, ~22 s, mais caprichado), só se a 2 for reprovada;
// 4. fal.ai BiRefNet: recorte fiel da foto real, sem manequim (fração de centavo), se nada passou;
// 5. Photoroom sandbox (grátis e ilimitada, com marca d'água), último recurso.
// Pra desligar o fal.ai, basta remover FAL_KEY na Vercel e fazer Redeploy.
//
// Duas chaves da Photoroom:
// - PHOTOROOM_LIVE_API_KEY (produção): fotos sem marca d'água, mas com cota limitada.
// - PHOTOROOM_API_KEY (sandbox): ilimitada pra testes, mas com marca d'água.
const STATUS_TROCA_PRA_SANDBOX = [401, 402, 403, 429];

// Até ~40 s no pior caso (Nano Banana reprovado + Pro + verificações).
export const maxDuration = 60;

type Modo = "producao" | "fal" | "fal-pro" | "recorte" | "sandbox";

export async function POST(req: NextRequest) {
  const chaveProducao = process.env.PHOTOROOM_LIVE_API_KEY;
  const chaveSandbox = process.env.PHOTOROOM_API_KEY;
  const chaveFal = process.env.FAL_KEY;
  if (!chaveProducao && !chaveSandbox && !chaveFal) {
    return NextResponse.json(
      { error: "Nenhuma chave da Photoroom configurada no servidor." },
      { status: 500 }
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("imageFile");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Nenhuma imagem enviada." }, { status: 400 });
  }

  const bytesOriginais = Buffer.from(await (file as Blob).arrayBuffer());
  const tipoOriginal = (file as Blob).type || "image/jpeg";
  const dataUriOriginal = `data:${tipoOriginal};base64,${bytesOriginais.toString("base64")}`;

  // Pede a vitrine em JPEG (fundo branco não precisa de PNG): a imagem volta
  // bem mais leve. Se a Photoroom recusar o parâmetro, tenta de novo em PNG.
  async function chamarPhotoroom(chave: string, comJpeg: boolean) {
    const form = new FormData();
    form.append("imageFile", file as Blob, "peca.jpg");
    form.append("editWithAI.mode", "ai.auto");
    form.append("editWithAI.prompt", PROMPT);
    if (comJpeg) form.append("export.format", "jpeg");
    return fetch("https://image-api.photoroom.com/v2/edit", {
      method: "POST",
      headers: { "x-api-key": chave },
      body: form,
    });
  }

  async function tentarComChave(chave: string) {
    let res = await chamarPhotoroom(chave, true);
    if (res.status === 400) {
      const texto = await res.text().catch(() => "");
      console.warn("Photoroom recusou export.format=jpeg, tentando em PNG:", texto);
      res = await chamarPhotoroom(chave, false);
    }
    return res;
  }

  // Claude compara original × vitrine. Se o verificador falhar (rede, chave),
  // não bloqueia o cadastro: aprova e registra no log.
  async function verificar(vitrine: Buffer, tipoVitrine: string): Promise<{ aprovado: boolean; motivo: string }> {
    const chaveClaude = process.env.ANTHROPIC_API_KEY;
    if (!chaveClaude) return { aprovado: true, motivo: "sem verificador" };
    try {
      const imagem = (dados: Buffer, tipo: string) => ({
        type: "image",
        source: { type: "base64", media_type: tipo.includes("png") ? "image/png" : "image/jpeg", data: dados.toString("base64") },
      });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": chaveClaude, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: [imagem(bytesOriginais, tipoOriginal), imagem(vitrine, tipoVitrine), { type: "text", text: PROMPT_VERIFICA }] }],
        }),
      });
      if (!res.ok) {
        console.error("Verificador falhou:", res.status, await res.text().catch(() => ""));
        return { aprovado: true, motivo: "verificador indisponível" };
      }
      const dados = await res.json();
      const texto: string = dados?.content?.[0]?.text ?? "";
      const json = JSON.parse(texto.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
      const aprovado =
        json.corpo_ou_pele !== true && json.mesmo_tipo !== false &&
        (json.comprimento ?? "igual") === "igual" && json.cor_diferente !== true;
      return { aprovado, motivo: JSON.stringify(json) };
    } catch (err) {
      console.error("Erro no verificador:", err);
      return { aprovado: true, motivo: "erro no verificador" };
    }
  }

  // Chama um modelo do fal.ai e devolve os bytes da imagem gerada.
  async function chamarFal(chave: string, modelo: string, corpo: object): Promise<{ bytes: Buffer; tipo: string } | null> {
    try {
      const res = await fetch(`https://fal.run/${modelo}`, {
        method: "POST",
        headers: { Authorization: `Key ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        console.error(`fal.ai (${modelo}) retornou erro:`, res.status, await res.text().catch(() => ""));
        return null;
      }
      const dados = await res.json();
      const url: string | undefined = dados?.image?.url ?? dados?.images?.[0]?.url;
      if (!url) {
        console.error(`fal.ai (${modelo}) não devolveu imagem:`, JSON.stringify(dados).slice(0, 300));
        return null;
      }
      const imagemRes = await fetch(url);
      if (!imagemRes.ok) return null;
      return {
        bytes: Buffer.from(await imagemRes.arrayBuffer()),
        tipo: imagemRes.headers.get("content-type") || "image/jpeg",
      };
    } catch (err) {
      console.error(`Erro ao chamar fal.ai (${modelo}):`, err);
      return null;
    }
  }

  let resultado: { bytes: Buffer; tipo: string } | null = null;
  let modo: Modo = "sandbox";
  const reprovados: string[] = [];

  try {
    // 1. Photoroom produção
    if (chaveProducao) {
      const res = await tentarComChave(chaveProducao);
      if (STATUS_TROCA_PRA_SANDBOX.includes(res.status)) {
        console.warn(`Chave de produção da Photoroom recusada (${res.status}):`, await res.text().catch(() => ""));
      } else if (res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        const tipo = res.headers.get("content-type") || "image/jpeg";
        const v = await verificar(bytes, tipo);
        if (v.aprovado) { resultado = { bytes, tipo }; modo = "producao"; }
        else { reprovados.push(`Photoroom: ${v.motivo}`); }
      } else {
        console.error("Photoroom produção retornou erro:", res.status, await res.text().catch(() => ""));
      }
    }

    // 2 e 3. fal.ai Nano Banana, depois Nano Banana Pro
    if (!resultado && chaveFal) {
      const tentativas: [Modo, string, object][] = [
        ["fal", "fal-ai/nano-banana/edit", { prompt: PROMPT_FAL, image_urls: [dataUriOriginal], num_images: 1, output_format: "jpeg" }],
        ["fal-pro", "fal-ai/nano-banana-pro/edit", { prompt: PROMPT_FAL, image_urls: [dataUriOriginal], num_images: 1, output_format: "jpeg", resolution: "1K" }],
      ];
      for (const [m, modelo, corpo] of tentativas) {
        const gerada = await chamarFal(chaveFal, modelo, corpo);
        if (!gerada) continue;
        const v = await verificar(gerada.bytes, gerada.tipo);
        if (v.aprovado) { resultado = gerada; modo = m; break; }
        reprovados.push(`${modelo}: ${v.motivo}`);
      }
    }

    // 4. Recorte fiel (sem manequim, mas nunca inventa a peça)
    if (!resultado && chaveFal) {
      for (const modelo of ["fal-ai/birefnet/v2", "fal-ai/birefnet"]) {
        const recorte = await chamarFal(chaveFal, modelo, { image_url: dataUriOriginal });
        if (recorte) { resultado = recorte; modo = "recorte"; break; }
      }
    }

    // 5. Photoroom sandbox (marca d'água)
    if (!resultado && chaveSandbox) {
      const res = await tentarComChave(chaveSandbox);
      if (res.ok) {
        resultado = { bytes: Buffer.from(await res.arrayBuffer()), tipo: res.headers.get("content-type") || "image/png" };
        modo = "sandbox";
      } else {
        const texto = await res.text().catch(() => "");
        console.error("Photoroom sandbox retornou erro:", res.status, texto);
      }
    }
  } catch (err) {
    console.error("Erro de rede ao gerar a vitrine:", err);
    return NextResponse.json({ error: "Não foi possível falar com o serviço de imagem." }, { status: 502 });
  }

  if (reprovados.length) console.warn("Vitrines reprovadas pelo verificador:", reprovados);
  if (!resultado) {
    return NextResponse.json({ error: "Nenhum serviço de imagem respondeu." }, { status: 502 });
  }

  const descricaoModo = {
    producao: "Photoroom PRODUÇÃO (sem marca d'água)",
    fal: "fal.ai Nano Banana (manequim invisível, aprovado pelo verificador)",
    "fal-pro": "fal.ai Nano Banana Pro (manequim invisível, aprovado pelo verificador)",
    recorte: "fal.ai BiRefNet (recorte fiel, nenhuma vitrine passou no verificador)",
    sandbox: "Photoroom SANDBOX (com marca d'água)",
  }[modo];
  console.log(`Vitrine gerada com: ${descricaoModo}`);

  // Devolve a imagem direto pro celular, que ajusta a margem e faz um único upload.
  return new NextResponse(new Uint8Array(resultado.bytes), {
    status: 200,
    headers: {
      "Content-Type": resultado.tipo,
      "Cache-Control": "no-store",
      "X-Photoroom-Modo": modo,
      "X-Vitrine-Reprovadas": String(reprovados.length),
    },
  });
}
