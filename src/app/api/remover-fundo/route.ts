import { NextRequest, NextResponse } from "next/server";

const PROMPT =
  "Give the main garment a natural worn look with real volume and depth. " +
  "The item must always appear shaped as if worn by an invisible person, never flat. " +
  "Present it front facing and straight, with a realistic fit that shows contours, " +
  "curves, and natural tension lines while keeping the wearer fully invisible. " +
  "Only the product should appear, floating. Use the most flattering perspective and " +
  "make the item look new with very sharp and clean resolution. Show only the main " +
  "subject on a plain white background. If the original product is flat, add natural " +
  "3D structure so it looks worn while keeping the wearer invisible. Remove wrinkles if any.";

export async function POST(req: NextRequest) {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PHOTOROOM_API_KEY não configurada no servidor (.env.local)." },
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
  async function chamarPhotoroom(comJpeg: boolean) {
    const form = new FormData();
    form.append("imageFile", file as Blob, "peca.jpg");
    form.append("editWithAI.mode", "ai.auto");
    form.append("editWithAI.prompt", PROMPT);
    if (comJpeg) form.append("export.format", "jpeg");
    return fetch("https://image-api.photoroom.com/v2/edit", {
      method: "POST",
      headers: { "x-api-key": apiKey as string },
      body: form,
    });
  }

  let photoroomRes: Response;
  try {
    photoroomRes = await chamarPhotoroom(true);
    if (photoroomRes.status === 400) {
      const texto = await photoroomRes.text().catch(() => "");
      console.warn("Photoroom recusou export.format=jpeg, tentando em PNG:", texto);
      photoroomRes = await chamarPhotoroom(false);
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

  // Devolve a imagem direto pro celular. Antes o servidor subia a imagem pro
  // Supabase e o celular tinha que baixar de lá de novo (uma ida e volta a mais).
  // Agora o celular ajusta o enquadramento e faz um único upload.
  const imagem = await photoroomRes.arrayBuffer();
  return new NextResponse(imagem, {
    status: 200,
    headers: {
      "Content-Type": photoroomRes.headers.get("content-type") || "image/png",
      "Cache-Control": "no-store",
    },
  });
}
