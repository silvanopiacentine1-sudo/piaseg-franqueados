"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import { apiJson } from "../lib/api";

interface CidadeStat {
  uf: string;
  municipio: string;
  total: number;
  franqueados: { id: string; nome_fantasia: string }[];
}

export default function CidadesPage() {
  const [stats, setStats] = useState<CidadeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiJson<CidadeStat[]>("/franqueados/stats/municipio")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!q) return stats;
    const needle = q.toLowerCase();
    return stats.filter(
      (s) => s.municipio.toLowerCase().includes(needle) || s.uf.toLowerCase().includes(needle)
    );
  }, [stats, q]);

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="font-heading text-2xl" style={{ color: "#072a3c" }}>
            Franqueados por Cidade <span className="text-base font-sans text-black/50">({filtered.length} cidades)</span>
          </h1>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por cidade ou UF..."
          className="w-full max-w-md rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360] mb-4 bg-white"
        />

        {loading ? (
          <p className="text-black/60">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <div key={`${s.uf}-${s.municipio}`} className="bg-white rounded-lg border border-black/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-heading text-base" style={{ color: "#072a3c" }}>
                    {s.municipio}/{s.uf}
                  </h2>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "#f6f6f6", color: "#072a3c", border: "1px solid #c2a360" }}
                  >
                    {s.total}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {s.franqueados.map((f) => (
                    <li key={f.id}>
                      <Link href={`/franqueados/${f.id}`} className="text-sm text-black/70 hover:text-[#072a3c] hover:underline">
                        {f.nome_fantasia}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-black/50">Nenhuma cidade encontrada.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
