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

// Instrução pro fal.ai (Gemini 2.5 Flash Image, "nano-banana"): mesma ideia da vitrine,
// com ênfase em NÃO mudar a peça, porque modelos que redesenham a imagem podem
// alterar estampas e detalhes.
const PROMPT_FAL =
  "Turn this photo into a clean e-commerce product photo of the main item only, on a plain " +
  "pure white background, centered, front facing, sharp and well lit. If it is a clothing " +
  "garment, show it with natural volume as if worn by an invisible person (ghost mannequin), " +
  "never flat. If it is jewelry, a bag, shoes, a belt, glasses or another accessory, keep its " +
  "real shape and just present it cleanly. Keep the exact same item: do not change its colors, " +
  "prints, patterns, logos, text, buttons, materials or any detail. Remove people, hangers, " +
  "hands and the original background. Preserve the exact length, proportions, silhouette, cut " +
  "and hemline: never make the item longer, shorter, wider or looser than in the photo (short " +
  "shorts must stay short shorts, a cropped top stays cropped, a mini skirt stays mini).";

// Ordem de tentativa pra gerar a vitrine:
// 1. Photoroom com chave de produção (sem marca d'água, cota grátis limitada);
// 2. fal.ai (pago por foto, ~US$ 0,04), se FAL_KEY estiver configurada;
// 3. Photoroom sandbox (grátis e ilimitada, com marca d'água).
// Pra desligar o fal.ai, basta remover FAL_KEY na Vercel e fazer Redeploy.
//
// Duas chaves da Photoroom:
// - PHOTOROOM_LIVE_API_KEY (produção): fotos sem marca d'água, mas com cota limitada
//   (no plano grátis, 10 imagens por mês).
// - PHOTOROOM_API_KEY (sandbox): ilimitada pra testes, mas com marca d'água.
// O app tenta a de produção primeiro e, se a Photoroom recusar (cota acabou, chave
// inválida etc.), volta sozinho pra sandbox. Assim o cadastro nunca quebra.
const STATUS_TROCA_PRA_SANDBOX = [401, 402, 403, 429];

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

  // fal.ai: manda a foto como data URI e baixa o resultado pra devolver ao celular.
  async function tentarFal(chave: string): Promise<Response | null> {
    try {
      const bytes = Buffer.from(await (file as Blob).arrayBuffer());
      const dataUri = `data:${(file as Blob).type || "image/jpeg"};base64,${bytes.toString("base64")}`;
      const res = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
        method: "POST",
        headers: { Authorization: `Key ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: PROMPT_FAL,
          image_urls: [dataUri],
          num_images: 1,
          output_format: "jpeg",
        }),
      });
      if (!res.ok) {
        console.error("fal.ai retornou erro:", res.status, await res.text().catch(() => ""));
        return null;
      }
      const dados = await res.json();
      const url: string | undefined = dados?.images?.[0]?.url;
      if (!url) {
        console.error("fal.ai não devolveu imagem:", JSON.stringify(dados).slice(0, 300));
        return null;
      }
      const imagemRes = await fetch(url);
      return imagemRes.ok ? imagemRes : null;
    } catch (err) {
      console.error("Erro ao chamar fal.ai:", err);
      return null;
    }
  }

  let photoroomRes: Response | null = null;
  let modo: "producao" | "fal" | "sandbox" = "sandbox";
  try {
    if (chaveProducao) {
      modo = "producao";
      photoroomRes = await tentarComChave(chaveProducao);
      if (STATUS_TROCA_PRA_SANDBOX.includes(photoroomRes.status)) {
        const texto = await photoroomRes.text().catch(() => "");
        console.warn(`Chave de produção da Photoroom recusada (${photoroomRes.status}):`, texto);
        photoroomRes = null;
      }
    }
    if (!photoroomRes && chaveFal) {
      modo = "fal";
      photoroomRes = await tentarFal(chaveFal);
    }
    if (!photoroomRes && chaveSandbox) {
      modo = "sandbox";
      photoroomRes = await tentarComChave(chaveSandbox);
    }
    if (!photoroomRes) {
      return NextResponse.json({ error: "Nenhum serviço de imagem respondeu." }, { status: 502 });
    }
  } catch (err) {
    console.error("Erro de rede ao chamar Photoroom:", err);
    return NextResponse.json({ error: "Não foi possível falar com a Photoroom." }, { status: 502 });
  }

  if (!photoroomRes.ok) {
    const texto = await photoroomRes.text().catch(() => "");
    console.error("Photoroom retornou erro:", photoroomRes.status, texto);
    return NextResponse.json(
      { error: `Photoroom retornou erro ${photoroomRes.status}. ${texto}`.trim() },
      { status: 502 }
    );
  }

  const descricaoModo = {
    producao: "Photoroom PRODUÇÃO (sem marca d'água)",
    fal: "fal.ai nano-banana (pago por foto, sem marca d'água)",
    sandbox: "Photoroom SANDBOX (com marca d'água)",
  }[modo];
  console.log(`Vitrine gerada com: ${descricaoModo}`);

  // Devolve a imagem direto pro celular, que ajusta a margem e faz um único upload.
  const imagem = await photoroomRes.arrayBuffer();
  return new NextResponse(imagem, {
    status: 200,
    headers: {
      "Content-Type": photoroomRes.headers.get("content-type") || "image/png",
      "Cache-Control": "no-store",
      "X-Photoroom-Modo": modo,
    },
  });
}
