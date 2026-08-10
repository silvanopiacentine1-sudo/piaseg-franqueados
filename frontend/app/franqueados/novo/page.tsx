"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import FranqueadoForm from "../../components/FranqueadoForm";
import { apiJson } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { Franqueado, FranqueadoInput, FRANQUEADO_VAZIO } from "../../lib/types";

export default function NovoFranqueadoPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/");
  }, [router]);

  async function handleSubmit(data: FranqueadoInput) {
    const created = await apiJson<Franqueado>("/franqueados", {
      method: "POST",
      body: JSON.stringify(data),
    });
    router.push(`/franqueados/${created.id}`);
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        <h1 className="font-heading text-2xl mb-4" style={{ color: "#072a3c" }}>
          Novo Franqueado
        </h1>
        <FranqueadoForm initial={FRANQUEADO_VAZIO} onSubmit={handleSubmit} submitLabel="Cadastrar Franqueado" />
      </main>
    </div>
  );
}
