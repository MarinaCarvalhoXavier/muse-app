"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Login da dona do armário (e-mail + senha criados no painel do Supabase).
// Sem login, o app abre em modo visitante: dá pra ver tudo, mas não mudar nada.
export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.push("/");
  }

  return (
    <main className="px-4 pb-40 pt-8">
      <p className="text-xs uppercase tracking-wide text-black/40">Muse</p>
      <h1 className="font-[var(--font-display)] text-2xl">Entrar</h1>
      <p className="mt-1 text-sm text-black/50">
        Só a dona do armário entra aqui. Visitantes podem explorar o app sem conta.
      </p>

      <form onSubmit={entrar} className="mt-8 flex flex-col gap-3">
        <label className="text-sm">
          E-mail
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base outline-none focus:border-black/40"
          />
        </label>
        <label className="text-sm">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base outline-none focus:border-black/40"
          />
        </label>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={entrando}
          className="mt-2 rounded-full bg-[var(--color-ink)] py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
