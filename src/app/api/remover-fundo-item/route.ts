import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Remove o fundo de uma foto que já está pronta (já com o efeito vitrine),
// pra usar dentro do canvas de outfits sem aquele quadrado branco atrás
// quando duas peças se sobrepõem. É separado do fluxo de cadastro de peça:
// lá a Photoroom já devolve com fundo, aqui usamos o serviço clássico dela
// (v1/segment), sem edição por IA, só pra cortar o que já existe.
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

  const body = await req.json().catch(() => null);
  const fotoUrl = body?.fotoUrl as string | undefined;
  if (!fotoUrl) {
    return NextResponse.json({ error: "fotoUrl é obrigatória." }, { status: 400 });
  }

  try {
    const fotoRes = await fetch(fotoUrl);
    if (!fotoRes.ok) {
      return NextResponse.json({ error: "Não foi possível carregar a foto." }, { status: 502 });
    }
    const fotoBuffer = Buffer.from(await fotoRes.arrayBuffer());

    const segmentForm = new FormData();
    segmentForm.append("image_file", new Blob([fotoBuffer]), "peca.png");
    segmentForm.append("format", "png");
    segmentForm.append("channels", "rgba");

    const segmentRes = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: segmentForm,
    });

    if (!segmentRes.ok) {
      const texto = await segmentRes.text().catch(() => "");
      console.error("Photoroom (remoção de fundo) retornou erro:", segmentRes.status, texto);
      return NextResponse.json(
        { error: `Não foi possível remover o fundo (${segmentRes.status}).` },
        { status: 502 }
      );
    }

    const imagemBuffer = Buffer.from(await segmentRes.arrayBuffer());
    const supabase = createClient(supabaseUrl, supabaseKey);
    const nomeArquivo = `sem-fundo-${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("fotos-pecas")
      .upload(nomeArquivo, imagemBuffer, { contentType: "image/png" });

    if (uploadError) {
      console.error("Erro ao subir imagem sem fundo:", uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("fotos-pecas").getPublicUrl(nomeArquivo);
    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err) {
    console.error("Erro ao remover fundo da peça:", err);
    return NextResponse.json({ error: "Não foi possível remover o fundo agora." }, { status: 500 });
  }
}
