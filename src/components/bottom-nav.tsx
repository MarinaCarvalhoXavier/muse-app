"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Armário", icon: "fi-rr-clothes-hanger", iconActive: "fi-sr-clothes-hanger" },
  { href: "/outfits", label: "Looks", icon: "fi-rr-sparkles", iconActive: "fi-sr-sparkles" },
  { href: "/adicionar", label: "", icon: "fi-sr-plus", central: true },
  { href: "/stylist", label: "Stylist IA", icon: "fi-rr-robot", iconActive: "fi-sr-robot" },
  { href: "/perfil", label: "Perfil", icon: "fi-rr-user", iconActive: "fi-sr-user" },
];

export function BottomNav() {
  const pathname = usePathname();

  // No editor de looks (tela cheia) a barra de navegação some.
  if (/^\/outfits\/.+/.test(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          if (tab.central) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label="Adicionar peça"
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-lime)] text-[var(--color-ink)] shadow-lg shadow-black/20"
              >
                <i className={`${tab.icon} text-xl`} aria-hidden="true" />
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
                active ? "text-[var(--color-ink)]" : "text-black/40"
              }`}
            >
              <i className={`${active ? tab.iconActive : tab.icon} text-lg`} aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
