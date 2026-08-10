"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API } from "./lib/api";
import { setSession, getToken } from "./lib/auth";
import { useEffect } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const sessaoExpirada = params.get("sessao_expirada") === "1";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/franqueados");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Usuário ou senha inválidos");
      }
      const data = await res.json();
      setSession(data.token, data.name, data.username);
      router.push("/franqueados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-2xl text-center mb-1" style={{ color: "#072a3c" }}>
          Piaseg Franqueados
        </h1>
        <p className="text-center text-sm text-black/60 mb-6">Cadastro e consulta de unidades franqueadas</p>

        {sessaoExpirada && (
          <div className="mb-4 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm px-3 py-2">
            Sua sessão expirou. Faça login novamente.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-black/10 p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Usuário (e-mail)</label>
            <input
              type="email"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-black/20 px-3 py-2 outline-none focus:border-[#c2a360]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-black/20 px-3 py-2 outline-none focus:border-[#c2a360]"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md py-2 font-semibold text-white disabled:opacity-60"
            style={{ background: "#072a3c" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
