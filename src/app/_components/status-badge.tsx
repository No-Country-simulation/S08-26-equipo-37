import type { HealthStatus } from "@/features/maintenance/types";

const statusStyles: Record<HealthStatus, string> = {
  critical: "text-rose-700",
  watch: "text-amber-800",
  healthy: "text-emerald-700",
  maintenance: "text-sky-700",
};

export function StatusBadge({ label, status }: { label: string; status: HealthStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 text-xs font-medium ${statusStyles[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
