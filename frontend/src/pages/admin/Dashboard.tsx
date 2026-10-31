import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import StatCard from '../../components/StatCard';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const PIE = ['#10b981', '#f59e0b', '#0ea5e9', '#94a3b8', '#ef4444'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [ms, setMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const t0 = performance.now();

    try {
      const { data } = await api.get('/reports/dashboard', {
        params: {
          from: range.from || undefined,
          to: range.to || undefined,
        },
      });

      setData(data);
      setMs(Math.round(performance.now() - t0));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  const s = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Revenue Dashboard</h1>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            className="rounded border p-1"
            value={range.from}
            onChange={e => setRange({ ...range, from: e.target.value })}
          />

          <span>to</span>

          <input
            type="date"
            className="rounded border p-1"
            value={range.to}
            onChange={e => setRange({ ...range, to: e.target.value })}
          />

          <button
            onClick={load}
            className="rounded bg-indigo-600 px-3 py-1 text-white"
          >
            Apply
          </button>

          {ms !== null && (
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              ms < 2000
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              Loaded in {ms} ms
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active Subscriptions"
          value={loading ? '…' : s?.activeSubscriptions.toLocaleString('en-IN')}
          tone="indigo"
        />

        <StatCard
          label="Monthly Recurring Revenue"
          value={loading ? '…' : inr(s?.mrr)}
          tone="green"
        />

        <StatCard
          label="Payments Received"
          value={loading ? '…' : inr(s?.totalPayments)}
          tone="green"
          hint="in selected range"
        />

        <StatCard
          label="Outstanding"
          value={loading ? '…' : inr(s?.outstanding)}
          tone="amber"
        />

        <StatCard
          label="Overdue Invoices"
          value={loading ? '…' : s?.overdueInvoices}
          tone="red"
        />

        <StatCard
          label="High Renewal Risk"
          value={loading ? '…' : s?.renewalRisk}
          tone="red"
        />
      </div>

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Monthly revenue">
            <BarChart data={data.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: any) => inr(Number(v))} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </Card>

          <Card title="Revenue by plan">
            <BarChart data={data.revenueByPlan} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={130} />
              <Tooltip formatter={(v: any) => inr(Number(v))} />
              <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </Card>

          <Card title="Invoice status">
            <PieChart>
              <Pie
                data={data.invoiceStatus}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {data.invoiceStatus.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE[i % PIE.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </Card>

          <Card title="Subscription growth">
            <LineChart data={data.subscriptionGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                dataKey="subscriptions"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-medium text-slate-600">{title}</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}