// Paleta de cores com nome. No banco guardamos o código (hex), mas tudo o que
// aparece pra pessoa ou vai pra IA usa o NOME: assim o Stylist não precisa
// "adivinhar" que #9EC3E6 é azul-claro.
export const CORES: { nome: string; hex: string }[] = [
  { nome: "Preto", hex: "#000000" },
  { nome: "Branco", hex: "#FFFFFF" },
  { nome: "Off-white", hex: "#F2EAD8" },
  { nome: "Cinza", hex: "#9CA3AF" },
  { nome: "Bege", hex: "#D9C9A8" },
  { nome: "Marrom", hex: "#8B7355" },
  { nome: "Vinho", hex: "#6E1F2E" },
  { nome: "Vermelho", hex: "#B23A48" },
  { nome: "Rosa", hex: "#C97B94" },
  { nome: "Laranja", hex: "#D9743E" },
  { nome: "Amarelo", hex: "#E0B94F" },
  { nome: "Verde-oliva", hex: "#6B6B3A" },
  { nome: "Verde", hex: "#5C7A54" },
  { nome: "Azul-claro", hex: "#9EC3E6" },
  { nome: "Azul", hex: "#3B4A63" },
  { nome: "Azul-marinho", hex: "#1F2A44" },
  { nome: "Roxo", hex: "#6B4E71" },
  { nome: "Dourado", hex: "#C9A54C" },
  { nome: "Prateado", hex: "#C4C7CC" },
];

export const HEX_PADRAO = CORES.map((c) => c.hex);

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Cor da paleta mais parecida com um hex qualquer (ex: média de pixels). */
export function corMaisProximaDaPaleta(hex: string): string {
  const [r1, g1, b1] = rgb(hex);
  let melhor = CORES[0].hex;
  let menor = Infinity;
  for (const c of CORES) {
    const [r2, g2, b2] = rgb(c.hex);
    const d = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
    if (d < menor) {
      menor = d;
      melhor = c.hex;
    }
  }
  return melhor;
}

/** Nome da cor; pra cores personalizadas, usa o nome da cor da paleta mais parecida. */
export function nomeDaCor(hex: string): string {
  const exata = CORES.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  if (exata) return exata.nome;
  const proxima = CORES.find((c) => c.hex === corMaisProximaDaPaleta(hex));
  return proxima ? `${proxima.nome} (personalizada)` : hex;
}

export function hexDoNome(nome: string): string | null {
  const c = CORES.find((x) => x.nome.toLowerCase() === nome.trim().toLowerCase());
  return c ? c.hex : null;
}

/** Fundo da bolinha de cor; dourado e prateado ganham um degradê metálico. */
export function estiloSwatch(hex: string): React.CSSProperties {
  const h = hex.toUpperCase();
  if (h === "#C9A54C") return { background: "linear-gradient(135deg, #8C6A1F, #F3D98B 45%, #B8913A 70%, #E9CF7E)" };
  if (h === "#C4C7CC") return { background: "linear-gradient(135deg, #8E9399, #F4F5F7 45%, #A7ACB2 70%, #E3E6EA)" };
  return { backgroundColor: hex };
}
