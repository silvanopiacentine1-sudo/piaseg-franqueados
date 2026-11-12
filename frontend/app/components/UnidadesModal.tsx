"use client";

import { useState } from "react";
import { Unidade, UNIDADE_VAZIA, UF_LIST } from "../lib/types";

const inputCls =
  "w-full rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]";

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-black/60">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

export default function UnidadesModal({
  franqueadoNome,
  unidades,
  onChange,
  onClose,
}: {
  franqueadoNome: string;
  unidades: Unidade[];
  onChange: (next: Unidade[]) => void;
  onClose: () => void;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null); // -1 = nova
  const [draft, setDraft] = useState<Unidade>(UNIDADE_VAZIA);
  const [erro, setErro] = useState("");

  function set<K extends keyof Unidade>(key: K, value: Unidade[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function novo() {
    setDraft({ ...UNIDADE_VAZIA });
    setEditIndex(-1);
    setErro("");
  }

  function editar(i: number) {
    setDraft({ ...UNIDADE_VAZIA, ...unidades[i] });
    setEditIndex(i);
    setErro("");
  }

  function salvarUnidade() {
    if (!draft.nome.trim()) {
      setErro("Informe o nome da unidade.");
      return;
    }
    if (editIndex === -1) onChange([...unidades, draft]);
    else if (editIndex !== null) onChange(unidades.map((u, i) => (i === editIndex ? draft : u)));
    setEditIndex(null);
  }

  function remover(i: number) {
    if (!confirm(`Remover a unidade "${unidades[i].nome}"?`)) return;
    onChange(unidades.filter((_, idx) => idx !== i));
    if (editIndex === i) setEditIndex(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4"
      // Enter dentro do modal não pode submeter o formulário principal do franqueado
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
    >
      <div className="bg-[#f7f5f0] rounded-lg w-full max-w-4xl my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 bg-white rounded-t-lg">
          <div>
            <h2 className="font-heading text-lg" style={{ color: "#072a3c" }}>Unidades Vinculadas</h2>
            <p className="text-xs text-black/50">{franqueadoNome || "Franqueado"} · {unidades.length} unidade(s)</p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-black/50 hover:text-black px-2">
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {editIndex === null ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={novo}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                  style={{ background: "#072a3c" }}
                >
                  + Nova Unidade
                </button>
              </div>
              {unidades.length === 0 ? (
                <p className="text-sm text-black/50 bg-white rounded-md border border-black/10 p-4">
                  Nenhuma unidade cadastrada. Clique em &quot;+ Nova Unidade&quot;.
                </p>
              ) : (
                <div className="bg-white rounded-md border border-black/10 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-black/60 border-b border-black/10">
                      <tr>
                        <th className="px-3 py-2">Nº</th>
                        <th className="px-3 py-2">Unidade</th>
                        <th className="px-3 py-2">CNPJ</th>
                        <th className="px-3 py-2">Cidade/UF</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {unidades.map((u, i) => (
                        <tr key={i} className="border-b border-black/5 last:border-0">
                          <td className="px-3 py-2 text-black/50">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{u.nome}</td>
                          <td className="px-3 py-2">{u.cnpj}</td>
                          <td className="px-3 py-2">{[u.municipio, u.uf].filter(Boolean).join("/")}</td>
                          <td className="px-3 py-2">{u.status === "inativo" ? "Inativo" : "Ativo"}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button type="button" onClick={() => editar(i)} className="text-[#072a3c] hover:underline mr-3">
                              Editar
                            </button>
                            <button type="button" onClick={() => remover(i)} className="text-red-600 hover:underline">
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <p className="text-xs text-black/60">
                  As unidades são gravadas junto com o franqueado ao clicar em <b>Salvar</b> no cadastro.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-5 py-2 text-sm font-semibold text-white"
                  style={{ background: "#c2a360" }}
                >
                  Concluir
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-md border border-black/10 p-5">
              <h3 className="font-heading text-base mb-4" style={{ color: "#072a3c" }}>
                {editIndex === -1 ? "Nova Unidade" : `Editar Unidade Nº ${editIndex + 1}`}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Nome da Unidade *" value={draft.nome} onChange={(v) => set("nome", v)} />
                <Input label="CNPJ" value={draft.cnpj} onChange={(v) => set("cnpj", v)} />
                <div>
                  <label className="block text-xs font-medium mb-1 text-black/60">Status</label>
                  <select value={draft.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <Input label="Telefone" value={draft.telefone} onChange={(v) => set("telefone", v)} />
                <Input label="E-mail" type="email" value={draft.email} onChange={(v) => set("email", v)} />
                <Input label="Início da Operação" value={draft.inicio_operacao} onChange={(v) => set("inicio_operacao", v)} />
                <Input label="CEP" value={draft.cep} onChange={(v) => set("cep", v)} />
                <div>
                  <label className="block text-xs font-medium mb-1 text-black/60">UF</label>
                  <select value={draft.uf} onChange={(e) => set("uf", e.target.value)} className={inputCls}>
                    <option value="">—</option>
                    {UF_LIST.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <Input label="Município" value={draft.municipio} onChange={(v) => set("municipio", v)} />
                <Input label="Bairro" value={draft.bairro} onChange={(v) => set("bairro", v)} />
                <Input label="Logradouro" value={draft.logradouro} onChange={(v) => set("logradouro", v)} />
                <Input label="Número" value={draft.numero} onChange={(v) => set("numero", v)} />
                <Input label="Complemento" value={draft.complemento} onChange={(v) => set("complemento", v)} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium mb-1 text-black/60">Observação</label>
                  <textarea
                    value={draft.observacao}
                    onChange={(e) => set("observacao", e.target.value)}
                    rows={3}
                    placeholder="Informações diversas sobre esta unidade..."
                    className={inputCls + " resize-y"}
                  />
                </div>
              </div>
              {erro && <p className="text-red-600 text-sm mt-3">{erro}</p>}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={salvarUnidade}
                  className="rounded-md px-5 py-2 text-sm font-semibold text-white"
                  style={{ background: "#072a3c" }}
                >
                  {editIndex === -1 ? "Adicionar Unidade" : "Atualizar Unidade"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditIndex(null)}
                  className="rounded-md px-5 py-2 text-sm font-semibold border border-black/20"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
