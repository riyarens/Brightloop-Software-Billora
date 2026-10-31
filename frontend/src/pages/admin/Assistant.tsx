import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';

type Msg = { role: 'user' | 'bot'; text?: string; result?: any };

const fmt = (v: any) =>
  typeof v === 'number'
    ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : String(v ?? '').slice(0, 10) === String(v ?? '')
      ? v
      : String(v);

export default function Assistant() {
  const [chips, setChips] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: 'Ask me about revenue, overdue invoices, plans or renewals.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/insights/assistant/chips')
      .then(r => setChips(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;

    setMsgs(m => [...m, { role: 'user', text: question }]);
    setInput('');
    setBusy(true);

    try {
      const { data } = await api.post('/insights/assistant', { question });
      setMsgs(m => [...m, { role: 'bot', result: data }]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col rounded-xl border bg-white shadow-sm">
      <div className="border-b p-3 font-semibold">
        Revenue Assistant
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-full rounded-xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100'
              }`}
            >
              {m.text}
              {m.result && <Result r={m.result} onPick={ask} />}
            </div>
          </div>
        ))}

        {busy && (
          <div className="text-sm text-slate-400">Thinking…</div>
        )}

        <div ref={end} />
      </div>

      <div className="flex flex-wrap gap-2 border-t p-3">
        {chips.map(c => (
          <button
            key={c}
            onClick={() => ask(c)}
            className="rounded-full border border-indigo-200 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
          >
            {c}
          </button>
        ))}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t p-3"
      >
        <input
          className="flex-1 rounded-lg border p-2 text-sm"
          placeholder="Ask a question…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />

        <button className="rounded-lg bg-indigo-600 px-4 text-sm text-white">
          Ask
        </button>
      </form>
    </div>
  );
}

function Result({
  r,
  onPick,
}: {
  r: any;
  onPick: (q: string) => void;
}) {
  if (r.type === 'help') {
    return (
      <div>
        <p className="mb-1">{r.title}</p>
        {r.data.map((c: string) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="block text-left text-indigo-600 underline"
          >
            {c}
          </button>
        ))}
      </div>
    );
  }

  if (r.type === 'number') {
    return (
      <div>
        <p className="text-xs text-slate-500">{r.title}</p>
        <p className="text-3xl font-semibold">
          {r.unit}{Number(r.data).toLocaleString('en-IN')}
        </p>
      </div>
    );
  }

  const rows: any[] = r.data;
  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div>
      <p className="mb-1 text-xs text-slate-500">
        {r.title} · {rows.length} rows
      </p>

      {rows.length === 0 ? (
        <p>No results.</p>
      ) : (
        <div className="max-h-72 overflow-auto rounded border bg-white">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                {cols.map(c => (
                  <th key={c} className="px-2 py-1 text-left capitalize">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t">
                  {cols.map(c => (
                    <td key={c} className="px-2 py-1">
                      {fmt(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}