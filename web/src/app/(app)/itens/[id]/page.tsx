"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ajustarItem, analiseItem, excluirItem, movimentarItem, obterItem } from "@/lib/itens";
import { StatusBadge } from "@/components/StatusBadge";
import { NivelBar } from "@/components/NivelBar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const itemId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ajustando, setAjustando] = useState(false);

  const { data: item } = useQuery({ queryKey: ["item", itemId], queryFn: () => obterItem(itemId) });
  const { data: analise } = useQuery({ queryKey: ["analise", itemId], queryFn: () => analiseItem(itemId, 30) });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["item", itemId] });
    queryClient.invalidateQueries({ queryKey: ["itens"] });
  };

  const movimentar = useMutation({
    mutationFn: (tipo: "ENTRADA" | "SAIDA") => movimentarItem(itemId, tipo, 1),
    onSuccess: invalidar,
  });

  const excluir = useMutation({
    mutationFn: () => excluirItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens"] });
      router.push("/");
    },
  });

  if (!item) return <p className="py-10 text-center text-slate-400">Carregando...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">{item.nome}</h1>
        <StatusBadge status={item.status} />
      </div>
      <p className="-mt-4 text-xs uppercase tracking-wide text-slate-400">{item.categoria}</p>

      <div>
        <NivelBar percentual={item.percentual} status={item.status} />
        <p className="mt-2 text-sm text-slate-600">
          {item.qtd} unidades <span className="text-slate-400">(minimo {item.qtd_minima})</span>
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => movimentar.mutate("SAIDA")}
          disabled={movimentar.isPending}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          − Retirar
        </button>
        <button
          onClick={() => movimentar.mutate("ENTRADA")}
          disabled={movimentar.isPending}
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          + Repor
        </button>
      </div>
      {movimentar.isError && (
        <p className="text-sm text-red-600">
          {(movimentar.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Nao foi possivel movimentar."}
        </p>
      )}

      <div className="flex gap-4 text-sm">
        <button className="font-semibold text-blue-600 hover:underline" onClick={() => setAjustando(true)}>
          Ajustar item
        </button>
        <button
          className="font-semibold text-red-600 hover:underline"
          onClick={() => {
            if (confirm(`Excluir "${item.nome}"? O historico e mantido.`)) excluir.mutate();
          }}
        >
          Excluir
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Analise de consumo (30 dias)</h2>
        {!analise || analise.dias_obs === 0 ? (
          <p className="text-sm text-slate-400">Sem retiradas registradas no periodo.</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-slate-900">{analise.consumo_diario.toFixed(2)}</p>
                <p className="text-xs text-slate-500">Consumo/dia</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{analise.dias_restantes ?? "—"}</p>
                <p className="text-xs text-slate-500">Dias restantes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{analise.consumo_total}</p>
                <p className="text-xs text-slate-500">Total retirado</p>
              </div>
            </div>
            {analise.por_dia.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analise.por_dia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="data" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="retiradas" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>

      {ajustando && (
        <AjustarDialog
          item={item}
          onClose={() => setAjustando(false)}
          onSalvo={() => {
            invalidar();
            setAjustando(false);
          }}
        />
      )}
    </div>
  );
}

function AjustarDialog({
  item,
  onClose,
  onSalvo,
}: {
  item: { id: number; nome: string; qtd: number; qtd_minima: number };
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(item.nome);
  const [qtd, setQtd] = useState(String(item.qtd));
  const [qtdMinima, setQtdMinima] = useState(String(item.qtd_minima));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await ajustarItem(item.id, { nome: nome.trim(), qtd: Number(qtd) || 0, qtd_minima: Number(qtdMinima) || 0 });
      onSalvo();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { nome?: string[] } } })?.response?.data?.nome?.[0];
      setErro(msg ?? "Nao foi possivel salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Ajustar item</h2>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <div className="flex gap-3">
          <input
            type="number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
          />
          <input
            type="number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={qtdMinima}
            onChange={(e) => setQtdMinima(e.target.value)}
          />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
