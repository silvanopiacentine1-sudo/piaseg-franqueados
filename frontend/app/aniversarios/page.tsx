"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import { apiJson, downloadFile } from "../lib/api";

interface Aniversario {
  franqueado_id: string;
  franqueado_nome: string;
  contato_nome: string;
  funcao: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  dia: number;
  mes: number;
}

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function AniversariosPage() {
  const [items, setItems] = useState<Aniversario[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    apiJson<Aniversario[]>("/franqueados/aniversarios")
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map: Record<number, Aniversario[]> = {};
    for (const a of items) {
      (map[a.mes] ||= []).push(a);
    }
    return map;
  }, [items]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFile("/franqueados/aniversarios/export", `aniversarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      await downloadFile("/franqueados/aniversarios/export-pdf", `aniversarios_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao exportar PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="font-heading text-2xl" style={{ color: "#072a3c" }}>
            Aniversários <span className="text-base font-sans text-black/50">({items.length})</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-md px-4 py-2 text-sm font-semibold border border-[#072a3c] text-[#072a3c] hover:bg-[#072a3c]/5 disabled:opacity-60"
            >
              {exporting ? "Exportando..." : "⬇ Exportar Excel"}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="rounded-md px-4 py-2 text-sm font-semibold border border-[#072a3c] text-[#072a3c] hover:bg-[#072a3c]/5 disabled:opacity-60"
            >
              {exportingPdf ? "Exportando..." : "⬇ PDF"}
            </button>
          </div>
        </div>

        <p className="text-sm text-black/60 mb-4">
          Baseado na Data de Nascimento cadastrada nos contatos de cada franqueado.
        </p>

        {loading ? (
          <p className="text-black/60">Carregando...</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg border border-black/10 p-8 text-center text-black/50">
            Nenhum aniversário cadastrado ainda. Preencha a Data de Nascimento nos contatos dos franqueados.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.keys(grouped)
              .map(Number)
              .sort((a, b) => a - b)
              .map((mes) => (
                <div key={mes} className="bg-white rounded-lg border border-black/10 overflow-hidden">
                  <div className="px-4 py-2 font-heading text-sm" style={{ background: "#072a3c", color: "#c2a360" }}>
                    {MESES[mes]}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {grouped[mes].map((a, i) => (
                        <tr key={i} className="border-b border-black/5 last:border-0">
                          <td className="px-4 py-2 text-black/50 w-12">{String(a.dia).padStart(2, "0")}</td>
                          <td className="px-4 py-2 font-medium">{a.contato_nome}</td>
                          <td className="px-4 py-2 text-black/60">{a.funcao || "—"}</td>
                          <td className="px-4 py-2">
                            <Link href={`/franqueados/${a.franqueado_id}`} className="hover:underline" style={{ color: "#072a3c" }}>
                              {a.franqueado_nome}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-black/60">{a.telefone || "—"}</td>
                          <td className="px-4 py-2 text-black/60">{a.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
