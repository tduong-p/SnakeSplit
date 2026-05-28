import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import ExpenseTable from '../components/ExpenseTable';
import SplitExpenseModal from '../components/SplitExpenseModal';
import EditBoardModal from '../components/EditBoardModal';

const STATUS = {
  active:    { label: 'Active',           badge: 'badge-active'    },
  pending:   { label: 'Pending Payment',  badge: 'badge-pending'   },
  completed: { label: 'Completed',        badge: 'badge-completed' },
};

const fmt = (n) => (n || 0).toLocaleString('vi-VN') + ' ₫';

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
  const { activeUserId, users } = useUser();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplit, setShowSplit] = useState(false);
  const [showEditBoard, setShowEditBoard] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [memberLoading, setMemberLoading] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

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

  const doMemberAction = async (action, userId) => {
    setMemberLoading(`${action}-${userId}`);
    try {
      const res = await api.patch(`/boards/${id}/members`, { action, userId });
      setBoard(res.data);
    } catch (e) {
      alert(e.displayMessage || e.response?.data?.error || `Failed to ${action} member`);
    } finally {
      setMemberLoading(null);
      if (action === 'add') setShowAddMember(false);
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
                className="btn-outline flex items-center justify-center gap-1.5 order-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
                </svg>
                Split Expense
              </button>
              {isHost && (<>
                <button onClick={() => setShowEditBoard(true)}
                  className="btn-ghost flex items-center justify-center gap-1.5 order-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => doAction('close', 'Close this board? No more expenses can be added.',
                    () => api.post(`/boards/${id}/close`))}
                  disabled={actionLoading === 'close'}
                  className="bg-amber-500 hover:bg-amber-400 text-white font-semibold px-4 py-2.5
                             rounded-xl text-sm transition-all active:scale-[0.97] disabled:opacity-40
                             min-h-[44px] order-3">
                  {actionLoading === 'close' ? 'Closing...' : 'Close Board'}
                </button>
              </>)}
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

      {/* Participant management (active boards only) */}
      {board.status === 'active' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Participants
            </h2>
            {isHost && (
              <button onClick={() => setShowAddMember((v) => !v)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add member
              </button>
            )}
          </div>

          {/* Add member picker */}
          {showAddMember && (() => {
            const boardMemberIds = new Set([
              board.hostId._id,
              ...(board.participantIds || []).map((p) => p._id),
            ]);
            const available = users.filter((u) => !boardMemberIds.has(u._id));
            return available.length === 0 ? (
              <p className="text-xs text-slate-500 mb-4">All members are already in this board.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-700/50">
                {available.map((u) => (
                  <button key={u._id}
                    onClick={() => doMemberAction('add', u._id)}
                    disabled={!!memberLoading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700
                               hover:border-blue-500 hover:bg-blue-500/10 transition-colors text-sm
                               text-slate-300 cursor-pointer disabled:opacity-40">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: u.color }}>
                      {u.name[0].toUpperCase()}
                    </span>
                    {u.name}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Member list */}
          <div className="space-y-2">
            {/* Host */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: board.hostId.color }}>
                  {board.hostId.name[0].toUpperCase()}
                </span>
                <span className="text-sm text-slate-200 font-medium">{board.hostId.name}</span>
                <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/20
                                 rounded-full px-1.5 py-0.5">host</span>
              </div>
            </div>

            {/* Participants */}
            {(board.participantIds || []).map((p) => (
              <div key={p._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: p.color }}>
                    {p.name[0].toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-200">{p.name}</span>
                </div>
                {isHost && (
                  <button
                    onClick={() => {
                      if (!confirm(`Remove ${p.name} from this board?`)) return;
                      doMemberAction('remove', p._id);
                    }}
                    disabled={memberLoading === `remove-${p._id}`}
                    title={`Remove ${p.name}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600
                               hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer
                               disabled:opacity-40">
                    {memberLoading === `remove-${p._id}` ? (
                      <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement summary */}
      <SettlementSummary board={board} />

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

      {showEditBoard && (
        <EditBoardModal board={board} onClose={() => setShowEditBoard(false)}
          onUpdated={(updated) => { setBoard(updated); setShowEditBoard(false); }} />
      )}
    </div>
  );
}

function SettlementSummary({ board }) {
  const navigate = useNavigate();
  const [globalSettlements, setGlobalSettlements] = useState(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // For pending boards, fetch the global settlement so we can filter to this board's members
  useEffect(() => {
    if (board.status !== 'pending') { setGlobalSettlements(null); return; }
    setLoadingGlobal(true);
    api.get('/debts')
      .then((res) => setGlobalSettlements(res.data.settlements || []))
      .catch(() => setGlobalSettlements(null))
      .finally(() => setLoadingGlobal(false));
  }, [board.status, board._id]);

  const boardMemberIds = new Set([
    board.hostId._id,
    ...(board.participantIds || []).map((p) => p._id),
  ]);

  // For pending boards: filter global settlements to transfers between this board's members
  const pendingTransfers = globalSettlements?.filter(
    (s) => boardMemberIds.has(s.from._id) && boardMemberIds.has(s.to._id)
  ) || [];

  // For active/completed boards: use per-board calculation
  const localTransfers = getBoardSettlements(board);

  const isActive = board.status === 'active';
  const isPending = board.status === 'pending';
  const isCompleted = board.status === 'completed';

  const transfers = isPending ? pendingTransfers : localTransfers;

  const renderTransfer = (t, idx) => (
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
  );

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div>
          <h2 className="font-heading text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Settlement Summary
          </h2>
          {isActive && (
            <p className="text-xs text-amber-400/80 mt-1">
              Preview only — close the board to include in the Settlement tab
            </p>
          )}
          {isPending && (
            <p className="text-xs text-slate-500 mt-1">
              Amounts reflect net balance across all boards (confirmed payments deducted)
            </p>
          )}
          {isCompleted && (
            <p className="text-xs text-slate-500 mt-1">
              Final per-board split
            </p>
          )}
        </div>
        {isPending && (
          <button onClick={() => navigate('/')}
            className="text-xs text-blue-400 hover:text-blue-300 shrink-0 cursor-pointer transition-colors">
            View Settlement tab →
          </button>
        )}
      </div>

      {isPending && loadingGlobal ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transfers.length === 0 ? (
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-400">
            {isPending ? 'All settled up for this group — no transfers needed.' : 'All settled — no transfers needed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {transfers.map(renderTransfer)}
        </div>
      )}
    </div>
  );
}
