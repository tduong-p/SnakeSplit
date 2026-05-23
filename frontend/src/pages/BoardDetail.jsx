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
  const allPaid = board?.participantIds?.every((p) => board.paymentStatus?.[p._id] === true);

  const doAction = async (action, confirmMsg, apiCall) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActionLoading(action);
    try {
      const res = await apiCall();
      setBoard(res.data);
    } catch (e) {
      alert(e.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePayment = async (userId, current) => {
    try {
      const res = await api.patch(`/boards/${id}/payments/${userId}`, { paid: !current });
      setBoard(res.data);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update payment');
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
          <div className="flex gap-2 flex-wrap items-start">
            {board.status === 'active' && <>
              <button onClick={() => setShowSplit(true)}
                className="btn-outline flex items-center gap-1.5">
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
                             rounded-xl text-sm transition-all active:scale-[0.97] disabled:opacity-40">
                  {actionLoading === 'close' ? 'Closing...' : 'Close Board'}
                </button>
              )}
            </>}
            {board.status === 'pending' && isHost && allPaid && (
              <button
                onClick={() => doAction('complete', 'Mark this board as completed?',
                  () => api.post(`/boards/${id}/complete`))}
                disabled={actionLoading === 'complete'}
                className="btn-success">
                {actionLoading === 'complete' ? '...' : 'Mark Completed'}
              </button>
            )}
            <button onClick={() => navigate('/boards')} className="btn-ghost">
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
        {board.participantIds?.length === 0 ? (
          <p className="text-sm text-slate-500">No participants.</p>
        ) : (
          <div className="space-y-2">
            {board.participantIds?.map((p) => {
              const total = rowTotal(board, p._id);
              return (
                <div key={p._id}
                  className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white
                                     text-xs font-bold font-heading shrink-0"
                      style={{ backgroundColor: p.color }}>
                      {p.name[0].toUpperCase()}
                    </span>
                    <div className="text-sm">
                      <span className="font-semibold text-slate-200">{p.name}</span>
                      <span className="text-slate-500 mx-2">owes</span>
                      <span className="font-semibold text-slate-300">{board.hostId?.name}</span>
                    </div>
                  </div>
                  <span className="font-heading font-bold text-slate-100 tabular-nums">{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment status (pending / completed) */}
      {(board.status === 'pending' || board.status === 'completed') && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Payment Status
            </h2>
            {!isHost && <span className="text-xs text-slate-500">Only the host can mark payments</span>}
            {isHost && board.status === 'pending' && !allPaid && (
              <span className="text-xs text-amber-400">
                {board.participantIds?.filter((p) => board.paymentStatus?.[p._id]).length}/
                {board.participantIds?.length} paid
              </span>
            )}
          </div>

          <div className="space-y-2">
            {board.participantIds?.map((p) => {
              const paid = board.paymentStatus?.[p._id] === true;
              const total = rowTotal(board, p._id);
              return (
                <div key={p._id}
                  className={`flex items-center justify-between p-3.5 rounded-xl transition-colors ${
                    paid ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-700/40 border border-slate-700'
                  }`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={paid}
                      onChange={() => isHost && board.status === 'pending' && handleTogglePayment(p._id, paid)}
                      disabled={!isHost || board.status !== 'pending'}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500
                                 focus:ring-emerald-500 focus:ring-offset-0 disabled:cursor-default cursor-pointer" />
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white
                                     text-xs font-bold font-heading shrink-0"
                      style={{ backgroundColor: p.color }}>
                      {p.name[0].toUpperCase()}
                    </span>
                    <span className="font-medium text-slate-200">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-semibold text-slate-200 tabular-nums">{fmt(total)}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      paid
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                    }`}>
                      {paid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {isHost && board.status === 'pending' && (
            <p className="text-xs text-slate-500 mt-4">
              Tick each person after they pay you back.
              {allPaid && <span className="text-emerald-400 font-medium ml-1">All paid — you can mark this board completed.</span>}
            </p>
          )}
        </div>
      )}

      {showSplit && (
        <SplitExpenseModal board={board} onClose={() => setShowSplit(false)}
          onAdded={(updated) => { setBoard(updated); setShowSplit(false); }} />
      )}
    </div>
  );
}
