import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// "Despertador" do banco de dados.
// O plano grátis do Supabase pausa o projeto depois de ~7 dias sem uso.
// A Vercel chama esta rota uma vez por dia (ver vercel.json → crons),
// e ela faz uma consulta mínima no banco, o suficiente pra ele contar como "em uso".
export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ ok: false, error: "Variáveis do Supabase não configuradas." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.from("pieces").select("id").limit(1);

  if (error) {
    console.error("Keep-alive falhou:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
