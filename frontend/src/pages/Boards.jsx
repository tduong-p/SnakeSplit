import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import CreateBoardModal from '../components/CreateBoardModal';

const STATUS_LABELS = {
  active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-500' },
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
    const params = status && status !== 'all' ? `?status=${status}` : '';
    api.get(`/boards${params}`)
      .then((res) => setBoards(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBoards(filter); }, [filter]);

  const handleCreated = (board) => {
    setShowCreate(false);
    navigate(`/boards/${board._id}`);
  };

  const boardTotal = (board) =>
    board.expenses?.reduce((sum, exp) => {
      const amounts = exp.amounts || {};
      return sum + Object.values(amounts).reduce((s, v) => s + v, 0);
    }, 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Expense Boards</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Create Board
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : boards.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No boards yet.</p>
          <p className="text-sm mt-1">Create one to start tracking expenses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map((board) => {
            const { label, cls } = STATUS_LABELS[board.status] || STATUS_LABELS.active;
            const date = new Date(board.date).toLocaleDateString('vi-VN');
            const total = boardTotal(board);
            const paidCount = board.participantIds?.filter(
              (p) => board.paymentStatus?.[p._id] === true
            ).length || 0;

            return (
              <button
                key={board._id}
                onClick={() => navigate(`/boards/${board._id}`)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{board.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-3">
                      <span>{date}</span>
                      <span>Host: <strong className="text-gray-700">{board.hostId?.name}</strong></span>
                      <span>{board.participantIds?.length || 0} participants</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">{total.toLocaleString('vi-VN')} ₫</div>
                    {board.status === 'pending' && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {paidCount}/{board.participantIds?.length} paid
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateBoardModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />
      )}
    </div>
  );
}
