"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import BrMap from "../components/BrMap";
import { apiJson } from "../lib/api";
import { Franqueado } from "../lib/types";

interface UfStat {
  uf: string;
  total: number;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function interpolateColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bch = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}

export default function MapaPage() {
  const [stats, setStats] = useState<UfStat[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Franqueado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<UfStat[]>("/franqueados/stats/uf")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    stats.forEach((s) => (map[s.uf] = s.total));
    return map;
  }, [stats]);

  const maxCount = useMemo(() => Math.max(1, ...stats.map((s) => s.total)), [stats]);

  const colors = useMemo(() => {
    const map: Record<string, string> = {};
    stats.forEach((s) => {
      if (s.total === 0) {
        map[s.uf] = "#e8e6df";
        return;
      }
      const t = s.total / maxCount;
      map[s.uf] = interpolateColor("#d6bd8a", "#072a3c", t);
    });
    return map;
  }, [stats, maxCount]);

  async function handleSelect(uf: string) {
    setSelected(uf);
    const items = await apiJson<Franqueado[]>(`/franqueados?uf=${uf}`);
    setSelectedItems(items);
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        <h1 className="font-heading text-2xl mb-4" style={{ color: "#072a3c" }}>
          Franqueados por Estado <span className="text-base font-sans text-black/50">({stats.length} estados)</span>
        </h1>

        {loading ? (
          <p className="text-black/60">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            <div className="bg-white rounded-lg border border-black/10 p-4">
              <BrMap counts={counts} colors={colors} onSelect={handleSelect} />
              <div className="flex items-center gap-2 mt-3 text-xs text-black/60">
                <span>Menos franqueados</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: "linear-gradient(to right, #d6bd8a, #072a3c)" }} />
                <span>Mais franqueados</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-black/10 p-4">
              <h2 className="font-heading text-base mb-3" style={{ color: "#072a3c" }}>
                {selected ? `${selected} — ${selectedItems.length} franqueado(s)` : "Clique em um estado"}
              </h2>
              {selected && (
                <ul className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                  {selectedItems.map((f) => (
                    <li key={f.id}>
                      <Link
                        href={`/franqueados/${f.id}`}
                        className="block rounded-md px-3 py-2 text-sm hover:bg-[#f6f6f6] border border-black/5"
                      >
                        <span className="font-medium">{f.nome_fantasia}</span>
                        <span className="block text-black/50 text-xs">{f.municipio}</span>
                      </Link>
                    </li>
                  ))}
                  {selectedItems.length === 0 && (
                    <p className="text-black/50 text-sm">Nenhum franqueado neste estado.</p>
                  )}
                </ul>
              )}
              <div className="mt-4 pt-4 border-t border-black/10">
                <h3 className="text-xs font-medium text-black/60 mb-2">Ranking por estado</h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {[...stats].sort((a, b) => b.total - a.total).map((s) => (
                    <li key={s.uf} className="flex justify-between">
                      <button onClick={() => handleSelect(s.uf)} className="hover:underline text-left">
                        {s.uf}
                      </button>
                      <span className="text-black/60">{s.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
