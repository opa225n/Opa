import { STATUS_LABEL, statusBadgeClass } from "@/lib/format";

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${statusBadgeClass(status)}`}>{STATUS_LABEL[status] || status}</span>;
}
