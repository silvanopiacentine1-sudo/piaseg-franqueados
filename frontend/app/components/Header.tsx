"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getName, logout } from "../lib/auth";

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
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    setName(getName());
  }, []);

  function handleLogout() {
    logout();
    router.push("/");
  }

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
          <NavLink href="/admin/usuarios">Usuários</NavLink>
          <NavLink href="/admin/backups">Backups</NavLink>
          <span className="hidden sm:inline text-white/70">{name}</span>
          <button onClick={handleLogout} className="text-white/90 hover:text-white font-semibold cursor-pointer">
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
