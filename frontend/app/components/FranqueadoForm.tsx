"use client";

import { useState } from "react";
import { FranqueadoInput, MODALIDADES, UF_LIST } from "../lib/types";

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-black/60">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-black/10 p-5">
      <h2 className="font-heading text-base mb-4" style={{ color: "#072a3c" }}>{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

export default function FranqueadoForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: FranqueadoInput;
  onSubmit: (data: FranqueadoInput) => Promise<void>;
  submitLabel: string;
}) {
  const [data, setData] = useState<FranqueadoInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FranqueadoInput>(key: K, value: FranqueadoInput[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function addContato() {
    set("contatos", [...data.contatos, { nome: "", telefone: "", email: "" }]);
  }

  function updateContato(index: number, field: "nome" | "telefone" | "email", value: string) {
    const next = data.contatos.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    set("contatos", next);
  }

  function removeContato(index: number) {
    set("contatos", data.contatos.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Section title="Dados Gerais">
        <Field label="Nome Fantasia" value={data.nome_fantasia} onChange={(v) => set("nome_fantasia", v)} required />
        <Field label="Razão Social" value={data.razao_social} onChange={(v) => set("razao_social", v)} />
        <Field label="CNPJ" value={data.cnpj} onChange={(v) => set("cnpj", v)} />
        <div>
          <label className="block text-xs font-medium mb-1 text-black/60">Modalidade</label>
          <select
            value={data.modalidade}
            onChange={(e) => set("modalidade", e.target.value)}
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
          >
            <option value="">—</option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-black/60">Status</label>
          <select
            value={data.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <Field label="CPF do Franqueado" value={data.cpf_franqueado} onChange={(v) => set("cpf_franqueado", v)} />
      </Section>

      <div className="bg-white rounded-lg border border-black/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base" style={{ color: "#072a3c" }}>Contatos</h2>
          <button
            type="button"
            onClick={addContato}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
            style={{ background: "#072a3c" }}
          >
            + Contato
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {data.contatos.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end border border-black/10 rounded-md p-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-black/60">Nome</label>
                <input
                  value={c.nome}
                  onChange={(e) => updateContato(i, "nome", e.target.value)}
                  className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-black/60">Telefone</label>
                <input
                  value={c.telefone}
                  onChange={(e) => updateContato(i, "telefone", e.target.value)}
                  className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
                />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-black/60">E-mail</label>
                  <input
                    type="email"
                    value={c.email}
                    onChange={(e) => updateContato(i, "email", e.target.value)}
                    className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeContato(i)}
                  className="text-red-600 hover:underline text-sm px-2 py-2"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
          {data.contatos.length === 0 && (
            <p className="text-sm text-black/50">Nenhum contato adicionado.</p>
          )}
        </div>
      </div>

      <Section title="Endereço">
        <Field label="CEP" value={data.cep} onChange={(v) => set("cep", v)} />
        <div>
          <label className="block text-xs font-medium mb-1 text-black/60">UF</label>
          <select
            value={data.uf}
            onChange={(e) => set("uf", e.target.value)}
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
          >
            <option value="">—</option>
            {UF_LIST.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <Field label="Município" value={data.municipio} onChange={(v) => set("municipio", v)} />
        <Field label="Bairro" value={data.bairro} onChange={(v) => set("bairro", v)} />
        <Field label="Logradouro" value={data.logradouro} onChange={(v) => set("logradouro", v)} />
        <Field label="Número" value={data.numero} onChange={(v) => set("numero", v)} />
        <Field label="Complemento" value={data.complemento} onChange={(v) => set("complemento", v)} />
      </Section>

      <Section title="Datas">
        <Field label="Início da Operação" value={data.inicio_operacao} onChange={(v) => set("inicio_operacao", v)} />
        <Field label="Fim da Operação" value={data.fim_operacao} onChange={(v) => set("fim_operacao", v)} />
      </Section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md px-6 py-2.5 font-semibold text-white disabled:opacity-60"
        style={{ background: "#072a3c" }}
      >
        {saving ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
