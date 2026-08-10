"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";

function formatTimestamp(name: string): string {
  const match = name.match(/^(\d{8})-(\d{6})$/);
  if (!match) return name;
  const [, date, time] = match;
  const d = `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)}`;
  const t = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
  return `${d} ${t} (UTC)`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      setBackups(await apiJson<string[]>("/admin/backups"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(name: string) {
    if (!confirm(`Restaurar o backup de ${formatTimestamp(name)}? O estado atual será salvo como novo backup antes.`)) return;
    setRestoring(name);
    try {
      await apiJson(`/admin/backups/${name}/restore`, { method: "POST" });
      alert("Backup restaurado com sucesso.");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao restaurar backup");
    } finally {
      setRestoring("");
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-3xl w-full mx-auto px-4 py-6 flex-1">
        <h1 className="font-heading text-2xl mb-2" style={{ color: "#072a3c" }}>
          Backups
        </h1>
        <p className="text-sm text-black/60 mb-4">
          Um snapshot dos dados é criado automaticamente a cada atualização do sistema. Mantém os últimos 30.
        </p>

        {loading ? (
          <p className="text-black/60">Carregando...</p>
        ) : (
          <div className="bg-white rounded-lg border border-black/10 divide-y divide-black/5">
            {backups.map((b, i) => (
              <div key={b} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium">{formatTimestamp(b)}</span>
                  {i === 0 && (
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#e6f4ea", color: "#1e7e34" }}>
                      Mais recente
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRestore(b)}
                  disabled={restoring === b}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold border border-[#072a3c] text-[#072a3c] hover:bg-[#072a3c]/5 disabled:opacity-60"
                >
                  {restoring === b ? "Restaurando..." : "Restaurar"}
                </button>
              </div>
            ))}
            {backups.length === 0 && <p className="px-4 py-8 text-center text-black/50">Nenhum backup ainda.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
