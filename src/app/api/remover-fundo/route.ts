import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PROMPT =
  "Give the main garment a natural worn look with real volume and depth. " +
  "The item must always appear shaped as if worn by an invisible person, never flat. " +
  "Present it front facing and straight, with a realistic fit that shows contours, " +
  "curves, and natural tension lines while keeping the wearer fully invisible. " +
  "Only the product should appear, floating. Use the most flattering perspective and " +
  "make the item look new with very sharp and clean resolution. Show only the main " +
  "subject with the background fully removed — transparent, with no white box, frame, " +
  "shadow-plate or backdrop of any kind around it. If the original product is flat, add " +
  "natural 3D structure so it looks worn while keeping the wearer invisible. Remove wrinkles if any.";

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

  // Passo 1: a Photoroom "reimagina" a peça com volume (efeito vitrine).
  // Essa etapa generativa devolve a cena inteira que ela criou, fundo
  // incluso — por isso não dá pra confiar em nenhum parâmetro de fundo
  // nessa mesma chamada (testamos e isso desliga o efeito vitrine).
  const editForm = new FormData();
  editForm.append("imageFile", file, "peca.jpg");
  editForm.append("editWithAI.mode", "ai.auto");
  editForm.append("editWithAI.prompt", PROMPT);

  let editRes: Response;
  try {
    editRes = await fetch("https://image-api.photoroom.com/v2/edit", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: editForm,
    });
  } catch (err) {
    console.error("Erro de rede ao chamar Photoroom (edição):", err);
    return NextResponse.json({ error: "Não foi possível falar com a Photoroom." }, { status: 502 });
  }

  if (!editRes.ok) {
    const texto = await editRes.text().catch(() => "");
    console.error("Photoroom (edição) retornou erro:", editRes.status, texto);
    return NextResponse.json(
      { error: `Photoroom retornou erro ${editRes.status}. ${texto}`.trim() },
      { status: 502 }
    );
  }

  const imagemComVolume = Buffer.from(await editRes.arrayBuffer());

  // Passo 2: manda o resultado pro serviço clássico de remoção de fundo da
  // própria Photoroom (v1/segment), separado da edição por IA, pra tirar de
  // vez o fundo que a IA "pintou" no passo 1.
  const segmentForm = new FormData();
  segmentForm.append("image_file", new Blob([imagemComVolume], { type: "image/png" }), "peca-vitrine.png");
  segmentForm.append("format", "png");
  segmentForm.append("channels", "rgba");

  let segmentRes: Response;
  try {
    segmentRes = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: segmentForm,
    });
  } catch (err) {
    console.error("Erro de rede ao chamar Photoroom (remoção de fundo):", err);
    return NextResponse.json({ error: "Não foi possível remover o fundo da foto." }, { status: 502 });
  }

  if (!segmentRes.ok) {
    const texto = await segmentRes.text().catch(() => "");
    console.error("Photoroom (remoção de fundo) retornou erro:", segmentRes.status, texto);
    return NextResponse.json(
      { error: `Photoroom retornou erro ${segmentRes.status}. ${texto}`.trim() },
      { status: 502 }
    );
  }

  const imagemBuffer = Buffer.from(await segmentRes.arrayBuffer());
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
