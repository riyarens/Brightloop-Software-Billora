export default function StatCard({ label, value, hint, tone = 'slate' }:
  { label: string; value: string | number; hint?: string; tone?: 'slate' | 'green' | 'amber' | 'red' | 'indigo' }) {

  const bar = {
    slate: 'bg-slate-400',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500'
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {value}
      </p>

      {hint && (
        <p className="mt-1 text-xs text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}