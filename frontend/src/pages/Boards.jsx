import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import CreateBoardModal from '../components/CreateBoardModal';

const STATUS = {
  active:    { label: 'Active',    badge: 'badge-active',    bar: 'bg-emerald-500' },
  pending:   { label: 'Pending',   badge: 'badge-pending',   bar: 'bg-amber-500'   },
  completed: { label: 'Completed', badge: 'badge-completed', bar: 'bg-slate-600'   },
};

const FILTERS = ['all', 'active', 'pending', 'completed'];

export default function Boards() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchBoards = (status) => {
    setLoading(true);
    const q = status && status !== 'all' ? `?status=${status}` : '';
    api.get(`/boards${q}`)
      .then((res) => setBoards(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBoards(filter); }, [filter]);

  const boardTotal = (board) =>
    (board.expenses || []).reduce((sum, exp) => {
      return sum + Object.values(exp.amounts || {}).reduce((s, v) => s + v, 0);
    }, 0);

  const paidCount = (board) =>
    (board.participantIds || []).filter((p) => board.paymentStatus?.[p._id] === true).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-50">Boards</h1>
          <p className="text-sm text-slate-400 mt-0.5">{boards.length} board{boards.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Board
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto scrollbar-none w-full sm:w-fit">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium capitalize
                        transition-all duration-150 cursor-pointer whitespace-nowrap min-h-[40px] ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Board list */}
      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading boards...</p>
        </div>
      ) : boards.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="font-heading font-semibold text-slate-300">No boards yet</p>
          <p className="text-slate-500 text-sm mt-1">Create one to start tracking expenses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boards.map((board) => {
            const { label, badge, bar } = STATUS[board.status] || STATUS.active;
            const total = boardTotal(board);
            const paid = paidCount(board);
            const participantCount = board.participantIds?.length || 0;

            return (
              <button key={board._id} onClick={() => navigate(`/boards/${board._id}`)}
                className="card p-5 text-left hover:border-blue-500/50 hover:bg-slate-700/30
                           transition-all duration-150 active:scale-[0.99] cursor-pointer
                           flex flex-col gap-3 group overflow-hidden relative">

                {/* Status color bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />

                <div className="pl-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-heading font-bold text-slate-50 text-base leading-tight group-hover:text-white">
                      {board.name}
                    </span>
                    <span className={badge}>{label}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{new Date(board.date).toLocaleDateString('vi-VN')}</span>
                    <span>·</span>
                    <span>Host: <span className="text-slate-300 font-medium">{board.hostId?.name}</span></span>
                    <span>·</span>
                    <span>{participantCount} member{participantCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="pl-2 flex items-end justify-between">
                  <span className="font-heading font-bold text-xl text-slate-100 tabular-nums">
                    {total.toLocaleString('vi-VN')} ₫
                  </span>
                  {board.status === 'pending' && (
                    <span className="text-xs text-amber-400/80">
                      {paid}/{participantCount} paid
                    </span>
                  )}
                  {board.status === 'completed' && (
                    <span className="text-xs text-emerald-400/80">All settled</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateBoardModal
          onClose={() => setShowCreate(false)}
          onCreate={(board) => { setShowCreate(false); navigate(`/boards/${board._id}`); }}
        />
      )}
    </div>
  );
}
