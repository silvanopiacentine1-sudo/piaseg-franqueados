"use client";

import { useState } from "react";
import { FranqueadoInput, UF_LIST } from "../lib/types";

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

  function set<K extends keyof FranqueadoInput>(key: K, value: string) {
    setData((d) => ({ ...d, [key]: value }));
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
          <label className="block text-xs font-medium mb-1 text-black/60">Tipo</label>
          <select
            value={data.tipo}
            onChange={(e) => set("tipo", e.target.value)}
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
          >
            <option value="Loja Franqueada">Loja Franqueada</option>
            <option value="Unidade Própria">Unidade Própria</option>
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
        <Field label="Grupos" value={data.grupos} onChange={(v) => set("grupos", v)} />
      </Section>

      <Section title="Contato">
        <Field label="E-mail" value={data.email} onChange={(v) => set("email", v)} type="email" />
        <Field label="Telefone" value={data.telefone} onChange={(v) => set("telefone", v)} />
        <Field label="Celular" value={data.celular} onChange={(v) => set("celular", v)} />
      </Section>

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
        <Field label="Latitude" value={data.latitude} onChange={(v) => set("latitude", v)} />
        <Field label="Longitude" value={data.longitude} onChange={(v) => set("longitude", v)} />
      </Section>

      <Section title="Dados Societários">
        <Field label="IE" value={data.ie} onChange={(v) => set("ie", v)} />
        <Field label="Natureza Jurídica" value={data.natureza_juridica} onChange={(v) => set("natureza_juridica", v)} />
        <Field label="Capital Social" value={data.capital_social} onChange={(v) => set("capital_social", v)} />
      </Section>

      <Section title="Datas">
        <Field label="Início Implantação" value={data.data_inicio_implantacao} onChange={(v) => set("data_inicio_implantacao", v)} />
        <Field label="Fim Implantação" value={data.data_fim_implantacao} onChange={(v) => set("data_fim_implantacao", v)} />
        <Field label="Inauguração" value={data.data_inauguracao} onChange={(v) => set("data_inauguracao", v)} />
        <Field label="Criação" value={data.data_criacao} onChange={(v) => set("data_criacao", v)} />
        <Field label="Criação Sistema" value={data.data_criacao_sistema} onChange={(v) => set("data_criacao_sistema", v)} />
        <Field label="Inativação" value={data.data_inativacao} onChange={(v) => set("data_inativacao", v)} />
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
