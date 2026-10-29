import { Piece } from "./types";
import { nomeDaCor } from "./cores";

// Resumo em texto de uma peça, no formato que o Stylist IA recebe.
export function pecaResumo(p: Piece) {
  return {
    id: p.id,
    tipo: p.tipo,
    subtipos: p.subtipos ?? [],
    ocasioes: p.ocasioes,
    // Nome da cor ("Azul-claro") em vez do código, pra IA não errar a cor da peça.
    cores: (p.cores ?? []).map(nomeDaCor),
    peso: p.peso,
    marca: p.marca,
    estampa: p.estampa,
    favorita: p.favorita,
  };
}
