import { useEffect, useState } from "react";
import { analiseItem } from "../api/itens";
import { AnaliseItem, Item } from "../types";

export interface Previsao {
  item: Item;
  analise: AnaliseItem;
}

// Nao existe endpoint de analise agregada no backend (ver gap em CLAUDE.md),
// entao a previsao "o que vai acabar primeiro" e montada no cliente: busca
// a analise de consumo (30 dias) so dos itens ja "acabando", que costuma
// ser um punhado — sem paginacao pesada.
export function usePrevisao(itens: Item[]) {
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    const candidatos = itens.filter((i) => i.status === "baixo");
    if (candidatos.length === 0) {
      setPrevisoes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      candidatos.map(async (item) => {
        try {
          return { item, analise: await analiseItem(item.id) };
        } catch {
          return null;
        }
      })
    ).then((resultados) => {
      if (!ativo) return;
      const validas = resultados
        .filter((r): r is Previsao => r !== null && r.analise.dias_restantes != null)
        .sort((a, b) => (a.analise.dias_restantes ?? Infinity) - (b.analise.dias_restantes ?? Infinity));
      setPrevisoes(validas);
      setLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, [itens]);

  return { previsoes, loading };
}
