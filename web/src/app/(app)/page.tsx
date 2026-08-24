"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listarItens } from "@/lib/itens";
import { listarHistorico } from "@/lib/historico";
import { StatusBadge } from "@/components/StatusBadge";
import { NivelBar } from "@/components/NivelBar";
import { NewItemDialog } from "@/components/NewItemDialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "warn" | "danger" }) {
  const cor = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${cor}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [dialogAberto, setDialogAberto] = useState(false);

  const { data: itens = [], isLoading } = useQuery({ queryKey: ["itens"], queryFn: () => listarItens() });

  const trintaDiasAtras = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const { data: historico = [] } = useQuery({
    queryKey: ["historico", "saidas-30d"],
    queryFn: () => listarHistorico({ data_inicio: trintaDiasAtras }),
  });

  const categorias = useMemo(() => ["Todos", ...Array.from(new Set(itens.map((i) => i.categoria)))], [itens]);

  const filtrados = itens.filter((i) => {
    const combinaCategoria = categoria === "Todos" || i.categoria === categoria;
    const combinaBusca = !busca.trim() || i.nome.toLowerCase().includes(busca.trim().toLowerCase());
    return combinaCategoria && combinaBusca;
  });

  const resumo = {
    total: itens.length,
    emFalta: itens.filter((i) => i.status !== "ok").length,
    zerados: itens.filter((i) => i.status === "zerado").length,
    unidades: itens.reduce((acc, i) => acc + i.qtd, 0),
  };

  const topConsumo = useMemo(() => {
    const porItem = new Map<string, number>();
    for (const mov of historico) {
      if (mov.tipo !== "SAIDA") continue;
      porItem.set(mov.item_nome, (porItem.get(mov.item_nome) ?? 0) + mov.quantidade);
    }
    return Array.from(porItem.entries())
      .map(([nome, consumo]) => ({ nome, consumo }))
      .sort((a, b) => b.consumo - a.consumo)
      .slice(0, 5);
  }, [historico]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Itens" value={resumo.total} />
        <StatCard label="Em falta" value={resumo.emFalta} tone="warn" />
        <StatCard label="Zerados" value={resumo.zerados} tone="danger" />
        <StatCard label="Unidades" value={resumo.unidades} />
      </div>

      {topConsumo.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Mais consumidos (30 dias)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topConsumo} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="consumo" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Buscar item..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => setDialogAberto(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Novo item
          </button>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-slate-400">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="py-10 text-center text-slate-400">Nenhum item encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((item) => (
              <Link
                key={item.id}
                href={`/itens/${item.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-900">{item.nome}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">{item.categoria}</p>
                <NivelBar percentual={item.percentual} status={item.status} />
                <p className="mt-2 text-sm text-slate-500">
                  {item.qtd} un. <span className="text-slate-400">(min. {item.qtd_minima})</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <NewItemDialog
        open={dialogAberto}
        onClose={() => setDialogAberto(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["itens"] })}
      />
    </div>
  );
}
