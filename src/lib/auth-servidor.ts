import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { EMAIL_DONA } from "@/lib/dona";

// Rotas que gastam dinheiro (IA de imagem, Claude) só funcionam pra dona logada.
// O celular manda o token do login no cabeçalho Authorization.

function clienteComToken(token?: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

export async function donaDaRequisicao(req: NextRequest): Promise<SupabaseClient | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = clienteComToken(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || data.user?.email?.toLowerCase() !== EMAIL_DONA) return null;
  return supabase;
}

export function respostaModoVisitante() {
  return NextResponse.json(
    { error: "Modo demonstração: só a dona do armário pode usar isso. Entre na sua conta pelo Perfil." },
    { status: 401 }
  );
}

// Conta quantas vezes este visitante (IP anônimo, com hash) usou a ação hoje.
// Se a função do Supabase ainda não existir, deixa passar e registra no log.
export async function dentroDoLimiteVisitante(req: NextRequest, acao: string, limite: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
  const visitante = createHash("sha256").update(`muse:${ip}`).digest("hex").slice(0, 32);
  const { data, error } = await clienteComToken().rpc("contar_uso_visitante", { p_visitante: visitante, p_acao: acao });
  if (error) {
    console.error("Limite de visitante indisponível:", error.message);
    return true;
  }
  return typeof data === "number" ? data <= limite : true;
}
