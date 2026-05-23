import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import ExpenseTable from '../components/ExpenseTable';
import SplitExpenseModal from '../components/SplitExpenseModal';

const STATUS = {
  active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending Payment', cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600' },
};

const fmt = (n) => (n || 0).toLocaleString('vi-VN') + ' ₫';

function rowTotal(board, personId) {
  return (board.expenses || []).reduce((sum, exp) => {
    return sum + ((exp.amounts || {})[personId] || 0);
  }, 0);
}

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeUserId } = useUser();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplit, setShowSplit] = useState(false);
  const [closing, setClosing] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    api.get(`/boards/${id}`)
      .then((res) => setBoard(res.data))
      .catch(() => navigate('/boards'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const isHost = board?.hostId?._id === activeUserId;
  const allPaid = board?.participantIds?.every(
    (p) => board.paymentStatus?.[p._id] === true
  );

  const handleClose = async () => {
    if (!confirm('Close this board? No more expenses can be added.')) return;
    setClosing(true);
    try {
      const res = await api.post(`/boards/${id}/close`);
      setBoard(res.data);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to close board');
    } finally {
      setClosing(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this board as completed?')) return;
    setCompleting(true);
    try {
      const res = await api.post(`/boards/${id}/complete`);
      setBoard(res.data);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to complete board');
    } finally {
      setCompleting(false);
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

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!board) return null;

  const { label: statusLabel, cls: statusCls } = STATUS[board.status] || STATUS.active;
  const date = new Date(board.date).toLocaleDateString('vi-VN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusCls}`}>
                {statusLabel}
              </span>
            </div>
            <div className="text-sm text-gray-500 flex flex-wrap gap-3">
              <span>{date}</span>
              <span>
                Host:{' '}
                <span
                  className="font-semibold px-1.5 py-0.5 rounded text-white text-xs"
                  style={{ backgroundColor: board.hostId?.color }}
                >
                  {board.hostId?.name}
                </span>
              </span>
              <span>{board.participantIds?.length} participant{board.participantIds?.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {board.status === 'active' && (
              <>
                <button
                  onClick={() => setShowSplit(true)}
                  className="border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
                >
                  + Split Expense
                </button>
                {isHost && (
                  <button
                    onClick={handleClose}
                    disabled={closing}
                    className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                  >
                    {closing ? 'Closing...' : 'Close Board'}
                  </button>
                )}
              </>
            )}
            {board.status === 'pending' && isHost && allPaid && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {completing ? '...' : 'Mark Completed'}
              </button>
            )}
            <button
              onClick={() => navigate('/boards')}
              className="border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Expenses</h2>
        {board.expenses?.length === 0 && board.status === 'active' ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
            <p>No expenses yet.</p>
            <p className="text-sm mt-1">Add amounts in the table below, or use "+ Split Expense".</p>
          </div>
        ) : null}
        <ExpenseTable board={board} onBoardUpdate={setBoard} />
      </div>

      {/* Per-person settlement summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Settlement Summary</h2>
        {board.participantIds?.length === 0 ? (
          <p className="text-gray-400 text-sm">No participants.</p>
        ) : (
          <div className="space-y-2">
            {board.participantIds?.map((p) => {
              const total = rowTotal(board, p._id);
              return (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name[0].toUpperCase()}
                    </span>
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-gray-400 text-sm">owes</span>
                    <span className="font-medium text-gray-700">{board.hostId?.name}</span>
                  </div>
                  <span className="font-bold text-gray-800">{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment status — visible when pending or completed */}
      {(board.status === 'pending' || board.status === 'completed') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Payment Status</h2>
            {!isHost && (
              <span className="text-xs text-gray-400">Only the host can mark payments</span>
            )}
          </div>
          <div className="space-y-3">
            {board.participantIds?.map((p) => {
              const paid = board.paymentStatus?.[p._id] === true;
              const total = rowTotal(board, p._id);
              return (
                <div key={p._id} className={`flex items-center justify-between p-3 rounded-lg ${paid ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={paid}
                      onChange={() => isHost && board.status === 'pending' && handleTogglePayment(p._id, paid)}
                      disabled={!isHost || board.status !== 'pending'}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:cursor-default"
                    />
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name[0].toUpperCase()}
                    </span>
                    <span className="font-medium text-gray-800">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700">{fmt(total)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {paid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {isHost && board.status === 'pending' && (
            <p className="text-xs text-gray-400 mt-3">
              Tick each person after they pay you back. Once all are ticked, you can mark the board completed.
            </p>
          )}
        </div>
      )}

      {showSplit && (
        <SplitExpenseModal
          board={board}
          onClose={() => setShowSplit(false)}
          onAdded={(updated) => { setBoard(updated); setShowSplit(false); }}
        />
      )}
    </div>
  );
}
