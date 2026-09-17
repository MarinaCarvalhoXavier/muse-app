// crypto.randomUUID() só existe em contextos seguros (HTTPS ou localhost).
// Acessando pelo IP da rede local (ex: pra testar no celular), o navegador
// trata como inseguro e essa função nem existe — daí o fallback abaixo.
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
