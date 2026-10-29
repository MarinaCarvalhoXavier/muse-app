// Nome do arquivo do recorte (foto sem fundo) de uma foto de peça.
// Cada foto tem um único recorte, reaproveitado em todos os looks; se a foto da
// peça mudar (Editar → Trocar foto), o nome muda junto e um recorte novo é feito.
export function nomeDoRecorte(fotoUrl: string): string {
  const base = fotoUrl.split("?")[0].split("/").pop() ?? "foto";
  return `sem-fundo/${base.replace(/\.[a-z0-9]+$/i, "")}.png`;
}
