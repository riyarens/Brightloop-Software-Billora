import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Model';

type Subscription = {
  id: string;
  subscriptionNumber: string;
  plan?: { name: string; billingPeriod: string; price: number };
  status: string;
  isPaused: boolean;
  startDate: string;
  nextBillingDate?: string;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      // Backend automatically isolates customer records when user has CUSTOMER role
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data?.data || []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleAction = async (id: string, action: 'pause' | 'resume') => {
    try {
      await api.post(`/subscriptions/${id}/${action}`);
      toast.success(`Subscription ${action}d successfully`);
      loadSubscriptions();
      if (selectedSub?.id === id) {
        setSelectedSub(null);
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Subscriptions</h1>
        <p className="text-sm text-slate-500">View and manage your active plans, services and billing renewals</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading your subscriptions…</div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-base font-semibold text-slate-800">No active subscriptions</h3>
          <p className="mt-1 text-sm text-slate-500">
            You do not currently have any active plans. Contact your account manager to activate services.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {subscriptions.map((sub) => {
            const total = sub.lines?.reduce((sum, l) => sum + Number(l.total), 0) || 0;
            return (
              <div
                key={sub.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-indigo-600">
                      {sub.subscriptionNumber}
                    </span>
                    <StatusBadge status={sub.isPaused ? 'PAUSED' : sub.status} />
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-900">
                    {sub.plan?.name || 'SaaS Subscription'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Billed {sub.plan?.billingPeriod.toLowerCase()}
                  </p>

                  <div className="mt-4 border-t pt-3">
                    <span className="text-xs font-semibold uppercase text-slate-400">Included Services</span>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                      {sub.lines?.map((line) => (
                        <li key={line.id} className="flex justify-between">
                          <span>{line.description} (×{line.quantity})</span>
                          <span className="font-semibold text-slate-900">
                            ₹{Number(line.total).toLocaleString('en-IN')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Renewal Date</span>
                      <p className="text-sm font-semibold text-slate-800">
                        {sub.nextBillingDate
                          ? new Date(sub.nextBillingDate).toLocaleDateString()
                          : 'Continuous'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400">Plan Rate</span>
                      <p className="text-xl font-bold text-indigo-600">
                        ₹{total.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {sub.status === 'ACTIVE' && !sub.isPaused && (
                      <button
                        onClick={() => handleAction(sub.id, 'pause')}
                        className="flex-1 rounded-lg border border-amber-300 bg-amber-50 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        Pause Subscription
                      </button>
                    )}
                    {sub.isPaused && (
                      <button
                        onClick={() => handleAction(sub.id, 'resume')}
                        className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Resume Subscription
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedSub(sub)}
                      className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      <Modal open={!!selectedSub} title={selectedSub?.subscriptionNumber || ''} onClose={() => setSelectedSub(null)}>
        {selectedSub && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-400">Plan:</span>
                <p className="font-semibold text-slate-800">{selectedSub.plan?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Cycle:</span>
                <p className="font-semibold text-slate-800">{selectedSub.plan?.billingPeriod}</p>
              </div>
              <div>
                <span className="text-slate-400">Started:</span>
                <p className="font-semibold text-slate-800">
                  {new Date(selectedSub.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Next Renewal:</span>
                <p className="font-semibold text-slate-800">
                  {selectedSub.nextBillingDate
                    ? new Date(selectedSub.nextBillingDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Plan Components</h4>
              <div className="space-y-2">
                {selectedSub.lines?.map((line) => (
                  <div key={line.id} className="flex justify-between rounded border p-2 text-xs">
                    <div>
                      <p className="font-medium text-slate-800">{line.description}</p>
                      <p className="text-slate-400">Qty: {line.quantity} × ₹{Number(line.unitPrice).toLocaleString('en-IN')}</p>
                    </div>
                    <span className="font-semibold text-slate-900">
                      ₹{Number(line.total).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedSub(null)}
                className="rounded-lg border px-4 py-2 text-xs text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

