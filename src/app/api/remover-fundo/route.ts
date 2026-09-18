import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Variáveis do Supabase não configuradas no servidor." },
      { status: 500 }
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("imageFile");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Nenhuma imagem enviada." }, { status: 400 });
  }

  const photoroomForm = new FormData();
  photoroomForm.append("imageFile", file, "peca.jpg");
  photoroomForm.append("editWithAI.mode", "ai.auto");
  photoroomForm.append("editWithAI.prompt", PROMPT);

  let photoroomRes: Response;
  try {
    photoroomRes = await fetch("https://image-api.photoroom.com/v2/edit", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: photoroomForm,
    });
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

  const imagemBuffer = Buffer.from(await photoroomRes.arrayBuffer());
  const supabase = createClient(supabaseUrl, supabaseKey);
  const nomeArquivo = `${crypto.randomUUID()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-pecas")
    .upload(nomeArquivo, imagemBuffer, { contentType: "image/png" });

  if (uploadError) {
    console.error("Erro ao subir imagem pro Supabase:", uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("fotos-pecas").getPublicUrl(nomeArquivo);

  return NextResponse.json({ url: publicUrlData.publicUrl });
}
