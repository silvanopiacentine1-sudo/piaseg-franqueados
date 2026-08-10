"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";
import { getToken } from "../../lib/auth";

interface User {
  username: string;
  name: string;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      setUsers(await apiJson<User[]>("/admin/users"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await apiJson("/admin/users", {
        method: "POST",
        body: JSON.stringify({ name, username, password }),
      });
      setName("");
      setUsername("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(u: string) {
    if (!confirm(`Excluir o acesso de "${u}"?`)) return;
    try {
      await apiJson(`/admin/users/${encodeURIComponent(u)}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir usuário");
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1">
        <h1 className="font-heading text-2xl mb-4" style={{ color: "#072a3c" }}>
          Usuários do Portal
        </h1>

        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-black/10 p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1 text-black/60">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-black/60">E-mail</label>
            <input
              type="email"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-black/60">Senha</label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:border-[#c2a360]"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "#072a3c" }}
          >
            {creating ? "Criando..." : "+ Adicionar usuário"}
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
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.username}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(u.username)} className="text-red-600 hover:underline text-sm">
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
