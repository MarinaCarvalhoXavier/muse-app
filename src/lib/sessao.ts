"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMAIL_DONA } from "@/lib/dona";

// Sessão de login no celular. Sem login = modo visitante (só olhar).

export type Sessao = { carregando: boolean; dona: boolean; email: string | null };

export function useSessao(): Sessao {
  const [sessao, setSessao] = useState<Sessao>({ carregando: true, dona: false, email: null });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      const email = s?.user?.email?.toLowerCase() ?? null;
      setSessao({ carregando: false, dona: email === EMAIL_DONA, email });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return sessao;
}

// Cabeçalho com o token do login, pras rotas do servidor que usam IA.
export async function cabecalhosAuth(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const MENSAGEM_VISITANTE = "Modo demonstração: entre na sua conta (Perfil → Entrar) pra salvar mudanças.";

export async function exigirDona(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email?.toLowerCase() === EMAIL_DONA ? null : MENSAGEM_VISITANTE;
}
