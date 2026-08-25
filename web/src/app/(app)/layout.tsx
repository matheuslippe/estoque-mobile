"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, RotateCcwClock, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listaCompras } from "@/lib/shopping";

const LINKS = [
  { href: "/", label: "Estoque", icon: Package },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/historico", label: "Histórico", icon: RotateCcwClock },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, signedIn, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { data: compras } = useQuery({ queryKey: ["lista-compras"], queryFn: listaCompras, enabled: signedIn });

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/login");
  }, [loading, signedIn, router]);

  if (loading || !signedIn) {
    return <div className="flex min-h-screen items-center justify-center text-ink-faint">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[236px] flex-none flex-col gap-7 border-r border-border bg-bg-alt p-4.5">
        <Link href="/" className="flex items-center gap-2.5 px-1">
          <Image src="/icon-192.png" alt="" width={30} height={30} className="rounded-[10px]" />
          <span className="font-heading text-lg text-ink">dispensa.me</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {LINKS.map((link) => {
            const ativo = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            const badge = link.href === "/compras" ? compras?.length : undefined;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition ${
                  ativo ? "bg-primary text-primary-text" : "text-ink-muted hover:bg-surface"
                }`}
              >
                <Icon size={18} strokeWidth={2.3} />
                {link.label}
                {!!badge && (
                  <span className="ml-auto rounded-full bg-accent-200 px-1.5 py-0.5 text-[11px] font-bold text-accent-700">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="mt-auto flex items-center gap-2.5 rounded-2xl bg-surface px-3 py-2.5 text-left text-sm font-medium text-ink-muted transition hover:text-danger"
        >
          <LogOut size={16} strokeWidth={2.3} />
          Sair
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-7">{children}</main>
    </div>
  );
}
