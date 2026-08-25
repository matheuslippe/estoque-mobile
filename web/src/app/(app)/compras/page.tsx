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

  if (isLoading) return <p className="py-10 text-center text-ink-faint">Carregando...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-ink">Lista de compras</h1>
        <div className="flex gap-2">
          <button
            onClick={exportarCsv}
            disabled={itens.length === 0}
            className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => notificar.mutate()}
            disabled={notificar.isPending || itens.length === 0}
            className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
          >
            Enviar no Telegram
          </button>
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="py-10 text-center text-ink-faint">Nenhum item em falta no momento.</p>
      ) : (
        <>
          <button
            onClick={() => repor.mutate()}
            disabled={repor.isPending}
            className="w-full rounded-full bg-primary py-3 font-heading text-[15px] text-primary-text disabled:opacity-60"
          >
            {repor.isPending ? "Repondo..." : "Repor todos os itens em falta"}
          </button>

          <div className="space-y-6">
            {Object.entries(porCategoria).map(([cat, lista]) => (
              <div key={cat}>
                <h2 className="mb-2.5 text-[11.5px] font-bold tracking-wide text-ink-faint uppercase">{cat}</h2>
                <div className="space-y-2">
                  {lista.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5">
                      <div>
                        <p className="font-semibold text-ink">
                          {item.nome} {item.zerado && <span className="text-[11px] font-bold text-primary-strong">ZERADO</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          tem {item.qtd}, mínimo {item.qtd_minima}
                        </p>
                      </div>
                      <span className="font-heading text-xl text-primary-strong">+{item.qtd_a_comprar}</span>
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
