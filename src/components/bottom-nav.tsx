"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Armário", icon: "👗" },
  { href: "/outfits", label: "Outfits", icon: "✨" },
  { href: "/adicionar", label: "", icon: "+", central: true },
  { href: "/stylist", label: "Stylist IA", icon: "🤖" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

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
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-terracota)] text-2xl text-white shadow-lg shadow-black/20"
              >
                {tab.icon}
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
                active ? "text-[var(--color-terracota)]" : "text-black/40"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
