import { NextRequest, NextResponse } from "next/server";

// ROTA TEMPORÁRIA de teste: compara modelos de vitrine com manequim invisível.
// Será apagada depois do teste.
const TOKEN = "b33c736c5d4990c133349362";

const PROMPT =
  "Create a clean e-commerce ghost mannequin product photo of the main clothing item in this photo. " +
  "The photo may show the item worn by a person (for example a mirror selfie), lying on a bed, or on a hanger. " +
  "Remove the person completely: no skin, legs, arms, torso, hands, hair, phone, hanger or background. " +
  "Show only the garment, front facing, floating with natural 3D volume as if worn by an invisible person, " +
  "on a plain pure white background, sharp and well lit. " +
  "This is a catalog of the user's REAL clothes, so fidelity is the top priority: keep the exact same item, " +
  "with the same colors, fabric, prints, pockets, seams, buttons, logos and details. " +
  "Keep the exact length and proportions: the hem must end at the same point relative to the waistband as in the photo. " +
  "Never make it longer, shorter, wider or looser (very short shorts stay very short, a mini skirt stays mini, a cropped top stays cropped). " +
  "If it is an accessory, bag or shoes, keep its real shape and just present it cleanly.";

const MODELOS: Record<string, (img: string) => { url: string; body: object }> = {
  "nano-banana": (img) => ({ url: "fal-ai/nano-banana/edit", body: { prompt: PROMPT, image_urls: [img], num_images: 1, output_format: "jpeg" } }),
  "kontext-max": (img) => ({ url: "fal-ai/flux-pro/kontext/max", body: { prompt: PROMPT, image_url: img, output_format: "jpeg" } }),
  "nano-banana-pro": (img) => ({ url: "fal-ai/nano-banana-pro/edit", body: { prompt: PROMPT, image_urls: [img], num_images: 1, output_format: "jpeg", resolution: "1K" } }),
};

const PROMPT_VERIFICA =
  "Image 1 is the user's original photo of a real clothing item. Image 2 is an AI-generated catalog image that " +
  "should show the SAME item alone (ghost mannequin, white background). Check strictly and answer only JSON: " +
  '{"corpo_ou_pele": boolean (true if image 2 shows any skin, body parts, mannequin head, hands or a person), ' +
  '"mesmo_tipo": boolean (same kind of item), ' +
  '"comprimento": "igual" | "mais_longo" | "mais_curto" (compare length relative to the width of the waistband/body of the item), ' +
  '"detalhes_diferentes": string[] (short list of visible differences in color, pockets, buttons, print, fabric; empty if none), ' +
  '"aprovado": boolean (true only if no body, same type, same length and no major differences)}';

async function verificar(original: string, gerada: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "url", url: original } },
        { type: "image", source: { type: "url", url: gerada } },
        { type: "text", text: PROMPT_VERIFICA },
      ] }],
    }),
  });
  const d = await res.json();
  const t: string = d?.content?.[0]?.text ?? JSON.stringify(d).slice(0, 300);
  const m = t.match(/\{[\s\S]*\}/);
  try { return m ? JSON.parse(m[0]) : t; } catch { return t; }
}

export async function POST(req: NextRequest) {
  const { token, fotoUrl, modelo } = await req.json();
  if (token !== TOKEN) return NextResponse.json({ error: "não" }, { status: 403 });
  const m = MODELOS[modelo];
  if (!m) return NextResponse.json({ error: "modelo?" }, { status: 400 });
  const { url, body } = m(fotoUrl);
  const t0 = Date.now();
  const res = await fetch(`https://fal.run/${url}`, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const dados = await res.json().catch(() => null);
  const ms = Date.now() - t0;
  const gerada: string | undefined = dados?.images?.[0]?.url;
  if (!res.ok || !gerada) return NextResponse.json({ status: res.status, dados: JSON.stringify(dados).slice(0, 500), ms });
  const t1 = Date.now();
  const verificacao = await verificar(fotoUrl, gerada);
  return NextResponse.json({ modelo, ms, gerada, verificacao, msVerificacao: Date.now() - t1 });
}
