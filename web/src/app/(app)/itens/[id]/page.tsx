"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Pencil, Trash2 } from "lucide-react";
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

  if (!item) return <p className="py-10 text-center text-ink-faint">Carregando...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-ink">{item.nome}</h1>
        <StatusBadge status={item.status} />
      </div>
      <p className="-mt-4 text-xs tracking-wide text-ink-faint uppercase">{item.categoria}</p>

      <div>
        <NivelBar percentual={item.percentual} status={item.status} />
        <p className="mt-2 text-sm text-ink">
          {item.qtd} unidades <span className="text-ink-faint">(mínimo {item.qtd_minima})</span>
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => movimentar.mutate("SAIDA")}
          disabled={movimentar.isPending || item.qtd === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-semibold text-ink disabled:opacity-50"
        >
          <Minus size={17} strokeWidth={2.5} />
          Retirar
        </button>
        <button
          onClick={() => movimentar.mutate("ENTRADA")}
          disabled={movimentar.isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-text disabled:opacity-60"
        >
          <Plus size={17} strokeWidth={2.5} />
          Repor
        </button>
      </div>
      {movimentar.isError && (
        <p className="text-sm text-danger">
          {(movimentar.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Não foi possível movimentar."}
        </p>
      )}

      <div className="flex gap-5 text-sm">
        <button className="flex items-center gap-1.5 font-semibold text-primary-strong" onClick={() => setAjustando(true)}>
          <Pencil size={14} strokeWidth={2.5} />
          Ajustar item
        </button>
        <button
          className="flex items-center gap-1.5 font-semibold text-danger"
          onClick={() => {
            if (confirm(`Excluir "${item.nome}"? O histórico é mantido.`)) excluir.mutate();
          }}
        >
          <Trash2 size={14} strokeWidth={2.5} />
          Excluir
        </button>
      </div>

      <div className="rounded-2xl bg-surface p-5">
        <h2 className="mb-3.5 font-heading text-lg text-ink">Análise de consumo (30 dias)</h2>
        {!analise || analise.dias_obs === 0 ? (
          <p className="text-sm text-ink-faint">Sem retiradas registradas no período.</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-heading text-xl text-ink">{analise.consumo_diario.toFixed(2)}</p>
                <p className="text-xs text-ink-faint">Consumo/dia</p>
              </div>
              <div>
                <p className="font-heading text-xl text-ink">{analise.dias_restantes ?? "—"}</p>
                <p className="text-xs text-ink-faint">Dias restantes</p>
              </div>
              <div>
                <p className="font-heading text-xl text-ink">{analise.consumo_total}</p>
                <p className="text-xs text-ink-faint">Total retirado</p>
              </div>
            </div>
            {analise.por_dia.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analise.por_dia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="data" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="retiradas" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
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
      setErro(msg ?? "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6">
        <h2 className="font-heading text-xl text-ink">Ajustar item</h2>
        <input
          className="w-full rounded-full bg-bg px-4 py-2.5 text-sm text-ink outline-none"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <div className="flex gap-3">
          <input
            type="number"
            className="w-full rounded-full bg-bg px-4 py-2.5 text-sm text-ink outline-none"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
          />
          <input
            type="number"
            className="w-full rounded-full bg-bg px-4 py-2.5 text-sm text-ink outline-none"
            value={qtdMinima}
            onChange={(e) => setQtdMinima(e.target.value)}
          />
        </div>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full bg-bg py-2.5 text-sm font-semibold text-ink">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-text disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
