"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import FranqueadoForm from "../../components/FranqueadoForm";
import { apiJson } from "../../lib/api";
import { Franqueado, FranqueadoInput } from "../../lib/types";

export default function FranqueadoDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [franqueado, setFranqueado] = useState<Franqueado | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiJson<Franqueado>(`/franqueados/${params.id}`)
      .then(setFranqueado)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"));
  }, [params.id]);

  async function handleSubmit(data: FranqueadoInput) {
    const updated = await apiJson<Franqueado>(`/franqueados/${params.id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setFranqueado(updated);
  }

  async function handleDelete() {
    if (!confirm(`Excluir o franqueado "${franqueado?.nome_fantasia}"? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await apiJson(`/franqueados/${params.id}`, { method: "DELETE" });
      router.push("/franqueados");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir");
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="font-heading text-2xl" style={{ color: "#072a3c" }}>
            {franqueado ? (
              <>
                {franqueado.nome_fantasia || "Franqueado"}{" "}
                <span className="text-base font-sans text-black/50">Nº {franqueado.id}</span>
              </>
            ) : (
              "Carregando..."
            )}
          </h1>
          {franqueado && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md px-4 py-2 text-sm font-semibold border border-red-600 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? "Excluindo..." : "Excluir Franqueado"}
            </button>
          )}
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {franqueado && (
          <FranqueadoForm initial={franqueado} onSubmit={handleSubmit} submitLabel="Salvar Alterações" />
        )}
      </main>
    </div>
  );
}
