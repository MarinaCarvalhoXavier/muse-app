"use client";

import { useState } from "react";
import { Outfit, Piece } from "@/lib/types";

// Miniatura de um look que "dá zoom" no conjunto de peças: calcula a caixa que
// envolve todas elas e amplia pra preencher o card, em vez de mostrar o canvas
// inteiro com espaço vazio sobrando.
export function LookMiniatura({ look, pieces }: { look: Outfit; pieces: Piece[] }) {
  // Proporção altura/largura de cada imagem, descoberta quando ela carrega.
  const [proporcoes, setProporcoes] = useState<Record<string, number>>({});

  const itens = look.itens
    .map((item) => ({ item, peca: pieces.find((p) => p.id === item.pecaId) }))
    .filter((x) => x.peca?.fotoUrl);

  if (itens.length === 0) {
    return <p className="flex h-full items-center justify-center text-xs text-black/30">Look vazio</p>;
  }

  // Canvas é 3:4, então a altura em % = largura% × proporção × (3/4).
  const caixas = itens.map(({ item }) => {
    const prop = proporcoes[item.id] ?? 1.2;
    return { item, w: item.largura, h: item.largura * prop * 0.75 };
  });
  const minX = Math.min(...caixas.map((c) => c.item.x));
  const minY = Math.min(...caixas.map((c) => c.item.y));
  const maxX = Math.max(...caixas.map((c) => c.item.x + c.w));
  const maxY = Math.max(...caixas.map((c) => c.item.y + c.h));
  const larguraTotal = Math.max(maxX - minX, 1);
  const alturaTotal = Math.max(maxY - minY, 1);
  const margem = 0.88; // deixa um respiro nas bordas
  const escala = Math.min((100 * margem) / larguraTotal, (100 * margem) / alturaTotal, 2.5);
  const sobraX = (100 - larguraTotal * escala) / 2;
  const sobraY = (100 - alturaTotal * escala) / 2;

  return (
    <>
      {caixas.map(({ item }) => {
        const peca = pieces.find((p) => p.id === item.pecaId)!;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.fotoSemFundoUrl ?? peca.fotoUrl}
            alt=""
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0) {
                const prop = img.naturalHeight / img.naturalWidth;
                setProporcoes((prev) => (prev[item.id] === prop ? prev : { ...prev, [item.id]: prop }));
              }
            }}
            className="absolute"
            style={{
              left: `${(item.x - minX) * escala + sobraX}%`,
              top: `${(item.y - minY) * escala + sobraY}%`,
              width: `${item.largura * escala}%`,
            }}
          />
        );
      })}
    </>
  );
}
