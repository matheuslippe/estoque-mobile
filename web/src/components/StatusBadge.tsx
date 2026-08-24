import { StatusItem } from "@/lib/types";

const ESTILO: Record<StatusItem, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  baixo: "bg-amber-50 text-amber-700 border-amber-200",
  zerado: "bg-red-50 text-red-700 border-red-200",
};

const LABEL: Record<StatusItem, string> = {
  ok: "OK",
  baixo: "Baixo",
  zerado: "Zerado",
};

export function StatusBadge({ status }: { status: StatusItem }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTILO[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABEL[status]}
    </span>
  );
}
