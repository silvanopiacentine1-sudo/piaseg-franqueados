"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { apiJson, downloadFile } from "../lib/api";
import { Franqueado, UF_LIST } from "../lib/types";

export default function FranqueadosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Franqueado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (uf) params.set("uf", uf);
      if (status) params.set("status", status);
      const data = await apiJson<Franqueado[]>(`/franqueados?${params.toString()}`);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar franqueados");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFile("/franqueados/export", `franqueados_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      await downloadFile("/franqueados/export-pdf", `franqueados_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao exportar PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  function primeiroContato(f: Franqueado) {
    return f.contatos && f.contatos.length > 0 ? f.contatos[0] : null;
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="font-heading text-2xl" style={{ color: "#072a3c" }}>
            Franqueados <span className="text-base font-sans text-black/50">({items.length})</span>
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
            <Link
              href="/franqueados/novo"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "#072a3c" }}
            >
              + Novo Franqueado
            </Link>
          </div>
        </div>

        <form onSubmit={handleFilterSubmit} className="bg-white rounded-lg border border-black/10 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium mb-1 text-black/60">Buscar (nome, razão social, CNPJ, contato, cidade)</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
              placeholder="Digite para buscar..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-black/60">UF</label>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
            >
              <option value="">Todos</option>
              {UF_LIST.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-black/60">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "#c2a360" }}
          >
            Filtrar
          </button>
        </form>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {loading ? (
          <p className="text-black/60">Carregando...</p>
        ) : (
          <div className="bg-white rounded-lg border border-black/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-black/60">
                  <th className="px-4 py-3 font-medium">Nº</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">CNPJ</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f, index) => {
                  const contato = primeiroContato(f);
                  return (
                    <tr
                      key={f.id}
                      onClick={() => router.push(`/franqueados/${f.id}`)}
                      className="border-b border-black/5 last:border-0 hover:bg-[#f6f6f6] cursor-pointer"
                    >
                      <td className="px-4 py-3 text-black/50">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{f.nome_fantasia || "—"}</td>
                      <td className="px-4 py-3">{f.cnpj || "—"}</td>
                      <td className="px-4 py-3">{contato?.email || "—"}</td>
                      <td className="px-4 py-3">{contato?.telefone || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={
                            f.status === "ativo"
                              ? { background: "#e6f4ea", color: "#1e7e34" }
                              : { background: "#fde8e8", color: "#c0392b" }
                          }
                        >
                          {f.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-black/50">
                      Nenhum franqueado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
