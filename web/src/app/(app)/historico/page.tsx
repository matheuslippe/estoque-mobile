"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarHistorico } from "@/lib/historico";
import { listarItens } from "@/lib/itens";
import { TipoMovimentacao } from "@/lib/types";
import { baixarCsv } from "@/lib/csv";

const PERIODOS = [
  { label: "7 dias", dias: 7 },
  { label: "30 dias", dias: 30 },
  { label: "90 dias", dias: 90 },
  { label: "Tudo", dias: null as number | null },
];

const TIPO_LABEL: Record<TipoMovimentacao, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
  CADASTRO: "Cadastro",
  EXCLUSAO: "Exclusão",
};

function corTipo(tipo: TipoMovimentacao) {
  if (tipo === "ENTRADA" || tipo === "CADASTRO") return "text-secondary";
  if (tipo === "SAIDA" || tipo === "EXCLUSAO") return "text-primary-strong";
  return "text-ink-muted";
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Chip({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
        ativo ? "bg-primary text-primary-text" : "bg-surface text-ink-muted hover:bg-bg-alt"
      }`}
    >
      {label}
    </button>
  );
}

export default function HistoricoPage() {
  const [periodo, setPeriodo] = useState(PERIODOS[1]);
  const [itemFiltro, setItemFiltro] = useState<number | null>(null);

  const { data: itens = [] } = useQuery({ queryKey: ["itens"], queryFn: () => listarItens() });

  const params = useMemo(() => {
    const p: { item?: number; data_inicio?: string } = {};
    if (itemFiltro) p.item = itemFiltro;
    if (periodo.dias) {
      const desde = new Date();
      desde.setDate(desde.getDate() - periodo.dias);
      p.data_inicio = desde.toISOString().slice(0, 10);
    }
    return p;
  }, [itemFiltro, periodo]);

  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["historico", params],
    queryFn: () => listarHistorico(params),
  });

  function exportarCsv() {
    baixarCsv(
      "historico.csv",
      ["Item", "Tipo", "Quantidade", "Data/Hora", "Origem", "Observacao"],
      movs.map((m) => [m.item_nome, TIPO_LABEL[m.tipo], m.quantidade, formatarData(m.data_hora), m.origem, m.obs ?? ""])
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-ink">Histórico</h1>
        <button
          onClick={exportarCsv}
          disabled={movs.length === 0}
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Chip key={p.label} label={p.label} ativo={p.dias === periodo.dias} onClick={() => setPeriodo(p)} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label="Todos os itens" ativo={itemFiltro === null} onClick={() => setItemFiltro(null)} />
        {itens.map((item) => (
          <Chip key={item.id} label={item.nome} ativo={itemFiltro === item.id} onClick={() => setItemFiltro(item.id)} />
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-ink-faint">Carregando...</p>
      ) : movs.length === 0 ? (
        <p className="py-10 text-center text-ink-faint">Nenhuma movimentação no período.</p>
      ) : (
        <div className="space-y-2">
          {movs.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full bg-current ${corTipo(m.tipo)}`} />
                <div>
                  <p className="text-sm font-semibold text-ink">{m.item_nome}</p>
                  <p className="text-xs text-ink-faint">
                    {TIPO_LABEL[m.tipo]} · {formatarData(m.data_hora)}
                    {m.obs ? ` · ${m.obs}` : ""}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-bold ${corTipo(m.tipo)}`}>
                {m.tipo === "SAIDA" || m.tipo === "EXCLUSAO" ? "-" : "+"}
                {m.quantidade}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
