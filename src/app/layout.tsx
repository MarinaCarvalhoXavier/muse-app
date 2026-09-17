import type { Metadata } from "next";
import "./globals.css";
import "./uicons-regular-rounded.css";
import "./uicons-solid-rounded.css";
import { BottomNav } from "@/components/bottom-nav";

export const metadata: Metadata = {
  title: "Muse — guarda-roupa com IA",
  description: "Seu guarda-roupa digital pessoal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased pb-24">
        <div className="relative mx-auto min-h-screen max-w-md bg-[var(--color-paper)]">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
