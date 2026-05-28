import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import ExpenseTable from '../components/ExpenseTable';
import SplitExpenseModal from '../components/SplitExpenseModal';

const STATUS = {
  active:    { label: 'Active',           badge: 'badge-active'    },
  pending:   { label: 'Pending Payment',  badge: 'badge-pending'   },
  completed: { label: 'Completed',        badge: 'badge-completed' },
};

const fmt = (n) => (n || 0).toLocaleString('vi-VN') + ' ₫';

function rowTotal(board, personId) {
  return (board.expenses || []).reduce((s, e) => s + ((e.amounts || {})[personId] || 0), 0);
}

// Optimized (min-cash-flow) settlement for a single board with potentially multiple payers
function getBoardSettlements(board) {
  const people = [{ ...board.hostId }, ...(board.participantIds || [])];
  const peopleMap = Object.fromEntries(people.map((p) => [p._id, p]));
  const net = {};

  for (const exp of (board.expenses || [])) {
    const amounts = exp.amounts || {};
    const rawPayer = exp.paidBy?._id || exp.paidBy || board.hostId._id;
    const payerStr = rawPayer?.toString ? rawPayer.toString() : rawPayer;

    for (const [uid, amt] of Object.entries(amounts)) {
      if (!amt || uid === payerStr) continue;
      net[uid] = (net[uid] || 0) - amt;
      net[payerStr] = (net[payerStr] || 0) + amt;
    }
  }

  const creditors = [];
  const debtors = [];
  for (const [id, bal] of Object.entries(net)) {
    if (bal > 0.5) creditors.push({ id, amount: bal });
    else if (bal < -0.5) debtors.push({ id, amount: -bal });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      from: peopleMap[debtors[i].id] || { _id: debtors[i].id, name: '?' },
      to:   peopleMap[creditors[j].id] || { _id: creditors[j].id, name: '?' },
      amount: Math.round(amount),
    });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.5) i++;
    if (creditors[j].amount < 0.5) j++;
  }
  return transfers;
}

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeUserId } = useUser();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplit, setShowSplit] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    api.get(`/boards/${id}`)
      .then((res) => setBoard(res.data))
      .catch(() => navigate('/boards'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const isHost = board?.hostId?._id === activeUserId;

  const doAction = async (action, confirmMsg, apiCall) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActionLoading(action);
    try {
      const res = await apiCall();
      setBoard(res.data);
    } catch (e) {
      alert(e.displayMessage || e.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!board) return null;

  const { label: statusLabel, badge } = STATUS[board.status] || STATUS.active;
  const date = new Date(board.date).toLocaleDateString('vi-VN');
  const grandTotal = (board.expenses || []).reduce((s, e) =>
    s + Object.values(e.amounts || {}).reduce((ss, v) => ss + v, 0), 0);

  return (
    <div className="space-y-5">
      {/* Board header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-heading text-2xl font-bold text-slate-50">{board.name}</h1>
              <span className={badge}>{statusLabel}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
              <span>{date}</span>
              <span>Host:
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: board.hostId?.color }}>
                  {board.hostId?.name}
                </span>
              </span>
              <span>{board.participantIds?.length} participant{board.participantIds?.length !== 1 ? 's' : ''}</span>
              <span className="font-heading font-bold text-slate-200">{fmt(grandTotal)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-start">
            {board.status === 'active' && <>
              <button onClick={() => setShowSplit(true)}
                className="btn-outline flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
                </svg>
                Split Expense
              </button>
              {isHost && (
                <button
                  onClick={() => doAction('close', 'Close this board? No more expenses can be added.',
                    () => api.post(`/boards/${id}/close`))}
                  disabled={actionLoading === 'close'}
                  className="bg-amber-500 hover:bg-amber-400 text-white font-semibold px-4 py-2.5
                             rounded-xl text-sm transition-all active:scale-[0.97] disabled:opacity-40
                             min-h-[44px]">
                  {actionLoading === 'close' ? 'Closing...' : 'Close Board'}
                </button>
              )}
            </>}
            {board.status === 'pending' && isHost && (
              <button
                onClick={() => doAction('complete', 'Mark this board as completed?',
                  () => api.post(`/boards/${id}/complete`))}
                disabled={actionLoading === 'complete'}
                className="btn-success">
                {actionLoading === 'complete' ? '...' : 'Mark Completed'}
              </button>
            )}
            <button onClick={() => navigate('/boards')} className="btn-ghost text-center">
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Expense table */}
      <div>
        <h2 className="font-heading text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Expenses
        </h2>
        {board.expenses?.length === 0 && board.status === 'active' && (
          <p className="text-sm text-slate-500 mb-3">
            No expenses yet — enter amounts in the table below, or use Split Expense.
          </p>
        )}
        <ExpenseTable board={board} onBoardUpdate={setBoard} />
      </div>

      {/* Settlement summary */}
      <div className="card p-5">
        <h2 className="font-heading text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Settlement Summary
        </h2>
        {(() => {
          const transfers = getBoardSettlements(board);
          if (transfers.length === 0) {
            return (
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400">All settled — no transfers needed.</p>
              </div>
            );
          }
          return (
            <div className="space-y-2">
              {transfers.map((t, idx) => (
                <div key={idx}
                  className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white
                                     text-xs font-bold font-heading shrink-0"
                      style={{ backgroundColor: t.from.color }}>
                      {t.from.name[0].toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-200 truncate">{t.from.name}</span>
                    <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white
                                     text-xs font-bold font-heading shrink-0"
                      style={{ backgroundColor: t.to.color }}>
                      {t.to.name[0].toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-200 truncate">{t.to.name}</span>
                  </div>
                  <span className="font-heading font-bold text-slate-100 tabular-nums ml-4 shrink-0">
                    {fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Host action hint when pending */}
      {board.status === 'pending' && isHost && (
        <p className="text-xs text-slate-500 text-center">
          Use the global Settlement page to confirm payments. Mark this board completed when everyone has settled.
        </p>
      )}

      {showSplit && (
        <SplitExpenseModal board={board} onClose={() => setShowSplit(false)}
          onAdded={(updated) => { setBoard(updated); setShowSplit(false); }} />
      )}
    </div>
  );
}
