import type { HealthStatus } from "@/features/maintenance/types";

const statusStyles: Record<HealthStatus, string> = {
  critical: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  watch: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  healthy: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  maintenance: "border-sky-300/20 bg-sky-300/10 text-sky-100",
};

export function StatusBadge({ label, status }: { label: string; status: HealthStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
