"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/franqueados" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`hover:text-white font-semibold ${active ? "text-white" : "text-white/80"}`}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  return (
    <header className="w-full" style={{ background: "#072a3c", borderBottom: "3px solid #c2a360" }}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/franqueados" className="font-heading text-lg" style={{ color: "#c2a360" }}>
          Piaseg Franqueados
        </Link>
        <nav className="flex items-center gap-4 text-sm flex-wrap">
          <NavLink href="/franqueados">Franqueados</NavLink>
          <NavLink href="/mapa">Mapa</NavLink>
          <NavLink href="/cidades">Por Cidade</NavLink>
          <NavLink href="/aniversarios">Aniversários</NavLink>
          <NavLink href="/admin/backups">Backups</NavLink>
        </nav>
      </div>
    </header>
  );
}
