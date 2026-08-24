"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listaCompras, notificarListaCompras, reporFaltantes } from "@/lib/shopping";
import { baixarCsv } from "@/lib/csv";

export default function ComprasPage() {
  const queryClient = useQueryClient();
  const { data: itens = [], isLoading } = useQuery({ queryKey: ["lista-compras"], queryFn: listaCompras });

  const repor = useMutation({
    mutationFn: reporFaltantes,
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ["lista-compras"] });
      queryClient.invalidateQueries({ queryKey: ["itens"] });
      alert(resultado.detail);
    },
  });

  const notificar = useMutation({
    mutationFn: notificarListaCompras,
    onSuccess: (resultado) => alert(resultado.detail),
  });

  const porCategoria = itens.reduce<Record<string, typeof itens>>((acc, item) => {
    (acc[item.categoria] ??= []).push(item);
    return acc;
  }, {});

  function exportarCsv() {
    baixarCsv(
      "lista-de-compras.csv",
      ["Item", "Categoria", "Qtd atual", "Qtd minima", "Comprar", "Zerado"],
      itens.map((i) => [i.nome, i.categoria, i.qtd, i.qtd_minima, i.qtd_a_comprar, i.zerado ? "sim" : "nao"])
    );
  }

  if (isLoading) return <p className="py-10 text-center text-slate-400">Carregando...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Lista de compras</h1>
        <div className="flex gap-2">
          <button
            onClick={exportarCsv}
            disabled={itens.length === 0}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => notificar.mutate()}
            disabled={notificar.isPending || itens.length === 0}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Enviar no Telegram
          </button>
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="py-10 text-center text-slate-400">Nenhum item em falta no momento.</p>
      ) : (
        <>
          <button
            onClick={() => repor.mutate()}
            disabled={repor.isPending}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {repor.isPending ? "Repondo..." : "Repor todos os itens em falta"}
          </button>

          <div className="space-y-6">
            {Object.entries(porCategoria).map(([cat, lista]) => (
              <div key={cat}>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{cat}</h2>
                <div className="space-y-2">
                  {lista.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.nome} {item.zerado && <span className="text-red-600">(ZERADO)</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          tem {item.qtd}, minimo {item.qtd_minima}
                        </p>
                      </div>
                      <span className="text-lg font-extrabold text-blue-600">+{item.qtd_a_comprar}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
