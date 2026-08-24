import { StatusItem } from "@/lib/types";

const COR: Record<StatusItem, string> = {
  ok: "bg-emerald-500",
  baixo: "bg-amber-500",
  zerado: "bg-red-500",
};

export function NivelBar({ percentual, status }: { percentual: number; status: StatusItem }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full ${COR[status]}`}
        style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }}
      />
    </div>
  );
}
