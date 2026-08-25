"use client";

import { useState } from "react";
import { criarItem } from "@/lib/itens";

export function NewItemDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [qtd, setQtd] = useState("0");
  const [qtdMinima, setQtdMinima] = useState("1");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!open) return null;

  function reset() {
    setNome("");
    setCategoria("");
    setQtd("0");
    setQtdMinima("1");
    setErro(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("Informe o nome do item.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await criarItem({
        nome: nome.trim(),
        categoria: categoria.trim(),
        qtd: Number(qtd) || 0,
        qtd_minima: Number(qtdMinima) || 1,
      });
      reset();
      onCreated();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { nome?: string[] } } })?.response?.data?.nome?.[0];
      setErro(msg ?? "Não foi possível cadastrar o item.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6">
        <h2 className="font-heading text-xl text-ink">Novo item</h2>

        <div className="space-y-3">
          <input
            className="w-full rounded-full bg-bg px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="w-full rounded-full bg-bg px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            placeholder="Categoria (opcional)"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-ink-muted">Quantidade</label>
              <input
                type="number"
                className="w-full rounded-full bg-bg px-4 py-2.5 text-sm text-ink outline-none"
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-ink-muted">Mínima</label>
              <input
                type="number"
                className="w-full rounded-full bg-bg px-4 py-2.5 text-sm text-ink outline-none"
                value={qtdMinima}
                onChange={(e) => setQtdMinima(e.target.value)}
              />
            </div>
          </div>
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="flex-1 rounded-full bg-bg py-2.5 text-sm font-semibold text-ink"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-text disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
