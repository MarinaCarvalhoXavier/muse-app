import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libera o acesso ao servidor de desenvolvimento pela rede local,
  // pra você testar o app pelo celular enquanto o Mac roda o `npm run dev`.
  allowedDevOrigins: ["192.168.0.56"],
};

export default nextConfig;
