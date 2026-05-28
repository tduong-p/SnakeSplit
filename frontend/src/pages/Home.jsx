import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

const fmt = (n) => n.toLocaleString('vi-VN') + ' ₫';

export default function Home() {
  const { users, activeUserId, selectUser } = useUser();
  const [settlements, setSettlements] = useState([]);
  const [viewingId, setViewingId] = useState(activeUserId);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const fetchDebts = useCallback(() => {
    setLoading(true);
    api.get('/debts')
      .then((res) => setSettlements(res.data.settlements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);
  useEffect(() => { setViewingId(activeUserId); }, [activeUserId]);

  const handleConfirm = async (s) => {
    const key = `${s.from._id}-${s.to._id}`;
    setConfirming(key);
    try {
      await api.post('/debts/confirm', {
        fromUserId: s.from._id, toUserId: s.to._id, amount: s.amount,
      });
      fetchDebts();
    } catch (e) {
      alert(e.displayMessage || e.response?.data?.error || 'Failed to confirm');
    } finally {
      setConfirming(null);
    }
  };

  const handleViewChange = (id) => {
    setViewingId(id);
    selectUser(id);
  };

  const viewingUser = users.find((u) => u._id === viewingId);
  const myOwes = settlements.filter((s) => s.from._id === viewingId);
  const owedToMe = settlements.filter((s) => s.to._id === viewingId);
  const others = settlements.filter((s) => s.from._id !== viewingId && s.to._id !== viewingId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-50">Settlement</h1>
          <p className="text-sm text-slate-400 mt-0.5">Optimized transfers across all pending boards</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-slate-500 hidden sm:block">Viewing as</span>
          <select
            value={viewingId || ''}
            onChange={(e) => handleViewChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl
                       px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
                       hover:bg-slate-700 transition-colors max-w-[110px] sm:max-w-none min-h-[44px]"
          >
            <option value="" disabled>Select</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          {viewingUser && (
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white
                             text-xs font-bold font-heading shrink-0"
              style={{ backgroundColor: viewingUser.color }}>
              {viewingUser.name[0].toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {!viewingId ? (
        <div className="card p-16 text-center">
          <p className="text-slate-400">Select a user above to see their debts.</p>
        </div>
      ) : loading ? (
        <div className="card p-16 text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading settlements...</p>
        </div>
      ) : settlements.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-heading font-semibold text-slate-200 text-lg">All settled up!</p>
          <p className="text-slate-400 text-sm mt-1">No pending debts across any boards.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {myOwes.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                {viewingUser?.name} owes
              </h2>
              <div className="space-y-2">
                {myOwes.map((s) => (
                  <DebtCard key={`${s.from._id}-${s.to._id}`}
                    s={s} variant="owe" viewingId={viewingId}
                    onConfirm={handleConfirm} confirming={confirming} />
                ))}
              </div>
            </section>
          )}

          {owedToMe.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Owed to {viewingUser?.name}
              </h2>
              <div className="space-y-2">
                {owedToMe.map((s) => (
                  <DebtCard key={`${s.from._id}-${s.to._id}`}
                    s={s} variant="receive" viewingId={viewingId}
                    onConfirm={handleConfirm} confirming={confirming} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Other transfers
              </h2>
              <div className="space-y-2">
                {others.map((s) => (
                  <DebtCard key={`${s.from._id}-${s.to._id}`}
                    s={s} variant="other" viewingId={viewingId}
                    onConfirm={handleConfirm} confirming={confirming} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DebtCard({ s, variant, viewingId, onConfirm, confirming }) {
  const key = `${s.from._id}-${s.to._id}`;
  const isReceiver = s.to._id === viewingId;

  const variantStyles = {
    owe:     'border-red-500/20 bg-red-500/5',
    receive: 'border-emerald-500/20 bg-emerald-500/5',
    other:   'border-slate-700/60 bg-slate-800',
  };

  const amtColor = {
    owe:     'text-red-400',
    receive: 'text-emerald-400',
    other:   'text-slate-200',
  };

  return (
    <div className={`rounded-2xl border ${variantStyles[variant]} ${isReceiver ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-white
                           text-sm font-bold font-heading shrink-0"
            style={{ backgroundColor: s.from.color }}>
            {s.from.name[0].toUpperCase()}
          </span>
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="font-semibold text-slate-100 truncate max-w-[70px] sm:max-w-none">
              {s.from.name}
            </span>
            <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="font-semibold text-slate-100 truncate max-w-[70px] sm:max-w-none">
              {s.to.name}
            </span>
          </div>
        </div>
        <span className={`font-heading font-bold tabular-nums shrink-0 text-sm ${amtColor[variant]}`}>
          {s.amount.toLocaleString('vi-VN')} ₫
        </span>
      </div>

      {isReceiver && (
        <button onClick={() => onConfirm(s)} disabled={confirming === key}
          className="mt-2.5 w-full btn-success text-sm py-2.5">
          {confirming === key ? '...' : '✓ Confirm Receipt'}
        </button>
      )}
    </div>
  );
}
