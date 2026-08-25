"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ChevronDown } from "lucide-react";
import { listarItens } from "@/lib/itens";
import { listarHistorico } from "@/lib/historico";
import { listaCompras, reporFaltantes } from "@/lib/shopping";
import { StatusBadge } from "@/components/StatusBadge";
import { NivelBar } from "@/components/NivelBar";
import { NewItemDialog } from "@/components/NewItemDialog";

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "warn" | "danger" | "highlight";
}) {
  if (tone === "highlight") {
    return (
      <div className="rounded-2xl bg-secondary p-4">
        <p className="text-[11.5px] font-bold tracking-wide text-white/80 uppercase">{label}</p>
        <p className="mt-2 font-heading text-3xl text-white">{value}</p>
      </div>
    );
  }
  const cor = tone === "danger" ? "text-danger" : tone === "warn" ? "text-primary-strong" : "text-ink";
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className={`text-[11.5px] font-bold tracking-wide uppercase ${tone ? cor : "text-ink-faint"}`}>{label}</p>
      <p className={`mt-2 font-heading text-3xl ${cor}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas as categorias");
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

  const { data: compras = [] } = useQuery({ queryKey: ["lista-compras"], queryFn: listaCompras });
  const repor = async () => {
    await reporFaltantes();
    queryClient.invalidateQueries({ queryKey: ["lista-compras"] });
    queryClient.invalidateQueries({ queryKey: ["itens"] });
  };

  const categorias = useMemo(() => ["Todas as categorias", ...Array.from(new Set(itens.map((i) => i.categoria)))], [itens]);

  const filtrados = itens.filter((i) => {
    const combinaCategoria = categoria === "Todas as categorias" || i.categoria === categoria;
    const combinaBusca = !busca.trim() || i.nome.toLowerCase().includes(busca.trim().toLowerCase());
    return combinaCategoria && combinaBusca;
  });

  const resumo = {
    total: itens.length,
    baixo: itens.filter((i) => i.status === "baixo").length,
    emFalta: itens.filter((i) => i.status === "zerado").length,
    unidades: itens.reduce((acc, i) => acc + i.qtd, 0),
  };

  const topConsumo = useMemo(() => {
    const porItem = new Map<string, number>();
    for (const mov of historico) {
      if (mov.tipo !== "SAIDA") continue;
      porItem.set(mov.item_nome, (porItem.get(mov.item_nome) ?? 0) + mov.quantidade);
    }
    const lista = Array.from(porItem.entries())
      .map(([nome, consumo]) => ({ nome, consumo }))
      .sort((a, b) => b.consumo - a.consumo)
      .slice(0, 5);
    const max = lista[0]?.consumo ?? 1;
    return lista.map((l) => ({ ...l, largura: Math.max(6, Math.round((l.consumo / max) * 100)) }));
  }, [historico]);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex h-10 max-w-[360px] flex-1 items-center gap-2.5 rounded-full bg-bg-alt px-4 text-[13.5px] text-ink-faint">
          <Search size={16} strokeWidth={2.5} />
          <input
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink-faint"
            placeholder="Buscar item..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="h-10 appearance-none rounded-full border border-border-strong bg-transparent pr-9 pl-4 text-[13.5px] font-semibold text-ink outline-none"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted" />
        </div>
        <button
          onClick={() => setDialogAberto(true)}
          className="ml-auto flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-heading text-[15px] text-primary-text"
        >
          <Plus size={16} strokeWidth={2.5} />
          Novo item
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Itens" value={resumo.total} />
        <StatCard label="Acabando" value={resumo.baixo} tone="warn" />
        <StatCard label="Em falta" value={resumo.emFalta} tone="danger" />
        <StatCard label="Unidades" value={resumo.unidades} tone="highlight" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="flex flex-col rounded-[22px] bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-lg text-ink">Mais consumidos · 30 dias</h2>
            <Link href="/historico" className="text-[12.5px] font-semibold text-primary-strong">
              Ver histórico
            </Link>
          </div>
          {topConsumo.length === 0 ? (
            <p className="mt-6 flex-1 text-sm text-ink-faint">Sem saídas registradas no período.</p>
          ) : (
            <div className="mt-5 flex flex-col gap-3.5">
              {topConsumo.map((c) => (
                <div key={c.nome} className="flex items-center gap-3">
                  <div className="w-[104px] shrink-0 truncate text-[13px] text-ink-muted">{c.nome}</div>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-border">
                    <div className="h-full rounded-md bg-primary" style={{ width: `${c.largura}%` }} />
                  </div>
                  <div className="w-6 shrink-0 text-right text-[12.5px] font-bold text-ink">{c.consumo}</div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-auto pt-4.5 text-xs text-ink-faint">Saídas registradas no app e no bot, somadas por item.</p>
        </div>

        <div className="flex flex-col rounded-[22px] bg-danger p-5 text-accent-200">
          <h2 className="font-heading text-lg text-primary-text">Lista de compras</h2>
          <p className="mt-1.5 text-[12.5px] text-accent-200/70">
            {compras.length} {compras.length === 1 ? "item" : "itens"}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {compras.length === 0 ? (
              <p className="text-[13px] text-accent-200/70">Nada faltando por aqui.</p>
            ) : (
              compras.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-2.5">
                  <span className="flex-1 truncate text-[13.5px] font-semibold">{item.nome}</span>
                  <span className="font-heading text-base text-accent-400">+{item.qtd_a_comprar}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-4.5">
            <button
              onClick={repor}
              disabled={compras.length === 0}
              className="flex h-[42px] items-center justify-center rounded-full bg-primary-text font-heading text-[15px] text-danger disabled:opacity-50"
            >
              Repor todos
            </button>
            <Link
              href="/compras"
              className="flex h-[38px] items-center justify-center rounded-full border border-accent-200/35 text-[12.5px] font-semibold"
            >
              Ver lista completa
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] bg-surface">
        {isLoading ? (
          <p className="py-10 text-center text-ink-faint">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="py-10 text-center text-ink-faint">Nenhum item encontrado.</p>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-border text-[11.5px] font-bold tracking-wide text-ink-faint uppercase">
                <th className="px-5 py-3 text-left">Item</th>
                <th className="px-5 py-3 text-left">Categoria</th>
                <th className="px-5 py-3 text-left">Nível</th>
                <th className="px-5 py-3 text-right">Qtd</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id} className="border-b border-border/70 last:border-0 hover:bg-bg-alt/40">
                  <td className="px-5 py-3">
                    <Link href={`/itens/${item.id}`} className="font-semibold text-ink hover:text-primary-strong">
                      {item.nome}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{item.categoria}</td>
                  <td className="px-5 py-3">
                    <div className="w-32">
                      <NivelBar percentual={item.percentual} status={item.status} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-ink-muted">
                    {item.qtd} / {item.qtd_minima}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
