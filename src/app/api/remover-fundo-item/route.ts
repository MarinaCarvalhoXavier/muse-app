import { NextRequest, NextResponse } from "next/server";
import { donaDaRequisicao, respostaModoVisitante } from "@/lib/auth-servidor";
import { createClient } from "@supabase/supabase-js";
import { nomeDoRecorte } from "@/lib/recorte";

// Recorta o fundo de uma foto de peça já pronta (vitrine), pra usar no canvas de
// looks sem o quadrado branco atrás quando as peças se sobrepõem.
//
// - Cada foto é recortada UMA vez: o resultado fica salvo em
//   fotos-pecas/sem-fundo/<nome-da-foto>.png e é reaproveitado em todos os looks.
// - Ordem de tentativa: fal.ai BiRefNet (recorte, fração de centavo por foto) →
//   Photoroom sandbox (grátis, com marca d'água), pra nunca quebrar.

async function recortarComFal(chave: string, fotoUrl: string): Promise<Buffer | null> {
  for (const modelo of ["fal-ai/birefnet/v2", "fal-ai/birefnet"]) {
    try {
      const res = await fetch(`https://fal.run/${modelo}`, {
        method: "POST",
        headers: { Authorization: `Key ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: fotoUrl }),
      });
      if (!res.ok) {
        console.error(`fal.ai (${modelo}) retornou erro:`, res.status, await res.text().catch(() => ""));
        continue;
      }
      const dados = await res.json();
      const url: string | undefined = dados?.image?.url ?? dados?.images?.[0]?.url;
      if (!url) {
        console.error(`fal.ai (${modelo}) não devolveu imagem:`, JSON.stringify(dados).slice(0, 300));
        continue;
      }
      const img = await fetch(url);
      if (img.ok) {
        console.log(`Recorte gerado com fal.ai (${modelo})`);
        return Buffer.from(await img.arrayBuffer());
      }
    } catch (err) {
      console.error(`Erro ao chamar fal.ai (${modelo}):`, err);
    }
  }
  return null;
}

async function recortarComPhotoroomSandbox(chave: string, fotoUrl: string): Promise<Buffer | null> {
  const fotoRes = await fetch(fotoUrl);
  if (!fotoRes.ok) return null;
  const form = new FormData();
  form.append("image_file", new Blob([Buffer.from(await fotoRes.arrayBuffer())]), "peca.png");
  form.append("format", "png");
  form.append("channels", "rgba");
  const res = await fetch("https://sdk.photoroom.com/v1/segment", {
    method: "POST",
    headers: { "x-api-key": chave },
    body: form,
  });
  if (!res.ok) {
    console.error("Photoroom (recorte) retornou erro:", res.status, await res.text().catch(() => ""));
    return null;
  }
  console.log("Recorte gerado com Photoroom SANDBOX (com marca d'água)");
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Variáveis do Supabase não configuradas no servidor." }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const fotoUrl = body?.fotoUrl as string | undefined;
  if (!fotoUrl) {
    return NextResponse.json({ error: "fotoUrl é obrigatória." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const caminho = nomeDoRecorte(fotoUrl);
  const { data: publico } = supabase.storage.from("fotos-pecas").getPublicUrl(caminho);

  try {
    // Já recortamos essa foto antes? Reaproveita sem custo.
    const existente = await fetch(publico.publicUrl, { method: "HEAD", cache: "no-store" });
    if (existente.ok) {
      return NextResponse.json({ url: publico.publicUrl, reaproveitado: true });
    }

    // Gerar recorte novo custa IA e grava no Storage: só a dona logada.
    const supabaseDona = await donaDaRequisicao(req);
    if (!supabaseDona) return respostaModoVisitante();

    let imagem: Buffer | null = null;
    if (process.env.FAL_KEY) imagem = await recortarComFal(process.env.FAL_KEY, fotoUrl);
    if (!imagem && process.env.PHOTOROOM_API_KEY) {
      imagem = await recortarComPhotoroomSandbox(process.env.PHOTOROOM_API_KEY, fotoUrl);
    }
    if (!imagem) {
      return NextResponse.json({ error: "Não consegui remover o fundo agora." }, { status: 502 });
    }

    const { error: uploadError } = await supabaseDona.storage
      .from("fotos-pecas")
      .upload(caminho, imagem, { contentType: "image/png", upsert: true });
    if (uploadError) {
      console.error("Erro ao salvar recorte:", uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    return NextResponse.json({ url: publico.publicUrl, reaproveitado: false });
  } catch (err) {
    console.error("Erro ao remover fundo da peça:", err);
    return NextResponse.json({ error: "Não foi possível remover o fundo agora." }, { status: 500 });
  }
}
