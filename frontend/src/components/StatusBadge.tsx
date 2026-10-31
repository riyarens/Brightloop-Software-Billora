const COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CONFIRMED: 'bg-amber-100 text-amber-700',
  SENT: 'bg-sky-100 text-sky-700',
  QUOTATION: 'bg-sky-100 text-sky-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  PAUSED: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-slate-200 text-slate-500',
  OVERDUE: 'bg-red-100 text-red-700',
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-emerald-100 text-emerald-700',
  OPEN: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        COLORS[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  );
}