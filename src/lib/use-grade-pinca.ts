"use client";

import { useEffect, useSyncExternalStore } from "react";

// Grade estilo galeria do iPhone: fazer pinça com dois dedos pra fechar
// mostra mais cards por linha (menores); abrir a pinça volta pro tamanho maior.
// A escolha fica salva no aparelho, separada por tela (chave).

const EVENTO = "muse:colunas";
let pincando = false;

// Usado pelo "segurar pra abrir menu": durante a pinça o menu não deve abrir.
export function estaPincando() {
  return pincando;
}

function ler(chave: string, opcoes: number[]): number {
  try {
    const v = Number(localStorage.getItem(chave));
    if (opcoes.includes(v)) return v;
  } catch {}
  return opcoes[0];
}

function salvar(chave: string, valor: number) {
  try {
    localStorage.setItem(chave, String(valor));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(callback: () => void) {
  window.addEventListener(EVENTO, callback);
  return () => window.removeEventListener(EVENTO, callback);
}

// Classes fixas (o Tailwind precisa ver os nomes inteiros no código).
const CLASSES: Record<number, string> = {
  2: "grid-cols-2 gap-3",
  3: "grid-cols-3 gap-2",
  4: "grid-cols-4 gap-1.5",
  5: "grid-cols-5 gap-1",
};

export function classeGrade(colunas: number) {
  return `grid ${CLASSES[colunas] ?? CLASSES[2]}`;
}

export function useGradePinca(chave: string, opcoes: number[] = [2, 3, 4, 5]) {
  const colunas = useSyncExternalStore(
    assinar,
    () => ler(chave, opcoes),
    () => opcoes[0]
  );

  useEffect(() => {
    let distanciaBase = 0;

    function distancia(t: TouchList) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }

    function inicio(e: TouchEvent) {
      if (e.touches.length === 2) {
        pincando = true;
        distanciaBase = distancia(e.touches);
      }
    }

    function mover(e: TouchEvent) {
      if (e.touches.length !== 2 || !pincando) return;
      // Impede o zoom do navegador e a rolagem durante a pinça.
      e.preventDefault();
      const d = distancia(e.touches);
      if (!distanciaBase) {
        distanciaBase = d;
        return;
      }
      const razao = d / distanciaBase;
      const atual = ler(chave, opcoes);
      const i = opcoes.indexOf(atual);
      // Um passo por vez; a base é reiniciada, então continuar a pinça dá mais passos.
      if (razao < 0.78 && i < opcoes.length - 1) {
        salvar(chave, opcoes[i + 1]);
        distanciaBase = d;
      } else if (razao > 1.28 && i > 0) {
        salvar(chave, opcoes[i - 1]);
        distanciaBase = d;
      }
    }

    function fim(e: TouchEvent) {
      if (e.touches.length < 2 && pincando) {
        distanciaBase = 0;
        // Pequena folga pra o dedo que sobra não abrir um card sem querer.
        setTimeout(() => {
          pincando = false;
        }, 300);
      }
    }

    // Safari: o gesto de pinça também dispara "gesturestart"; bloqueia o zoom da página.
    function bloquearZoom(e: Event) {
      e.preventDefault();
    }

    document.addEventListener("touchstart", inicio, { passive: true });
    document.addEventListener("touchmove", mover, { passive: false });
    document.addEventListener("touchend", fim);
    document.addEventListener("touchcancel", fim);
    document.addEventListener("gesturestart", bloquearZoom);
    return () => {
      document.removeEventListener("touchstart", inicio);
      document.removeEventListener("touchmove", mover);
      document.removeEventListener("touchend", fim);
      document.removeEventListener("touchcancel", fim);
      document.removeEventListener("gesturestart", bloquearZoom);
    };
    // opcoes é uma lista fixa por tela; usar o texto evita recriar a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, opcoes.join(",")]);

  return colunas;
}
