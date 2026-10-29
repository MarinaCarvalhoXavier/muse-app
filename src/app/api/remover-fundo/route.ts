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
  "clean, centered and sharp on a plain white background.";

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
  if (!chaveProducao && !chaveSandbox) {
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

  let photoroomRes: Response;
  let modo: "producao" | "sandbox" = chaveProducao ? "producao" : "sandbox";
  try {
    photoroomRes = await tentarComChave((chaveProducao ?? chaveSandbox) as string);
    if (modo === "producao" && chaveSandbox && STATUS_TROCA_PRA_SANDBOX.includes(photoroomRes.status)) {
      const texto = await photoroomRes.text().catch(() => "");
      console.warn(
        `Chave de produção recusada (${photoroomRes.status}), usando sandbox com marca d'água:`,
        texto
      );
      modo = "sandbox";
      photoroomRes = await tentarComChave(chaveSandbox);
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

  console.log(`Vitrine gerada com a chave de ${modo === "producao" ? "PRODUÇÃO (sem marca d'água)" : "SANDBOX (com marca d'água)"}`);

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
