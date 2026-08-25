import { StatusItem } from "@/lib/types";

const ESTILO: Record<StatusItem, string> = {
  ok: "bg-accent2-200 text-accent2-700",
  baixo: "bg-accent-200 text-accent-700",
  zerado: "bg-accent-800 text-accent-200",
};

const LABEL: Record<StatusItem, string> = {
  ok: "Suficiente",
  baixo: "Acabando",
  zerado: "Em falta",
};

export function StatusBadge({ status }: { status: StatusItem }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTILO[status]}`}>
      {LABEL[status]}
    </span>
  );
}
