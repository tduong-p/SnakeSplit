import { useState } from 'react';
import api from '../api/axios';

export default function SplitExpenseModal({ board, onClose, onAdded }) {
  const [label, setLabel] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitAmong, setSplitAmong] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // All people in this board: host + participants
  const everyone = [
    { ...board.hostId, isHost: true },
    ...board.participantIds,
  ];

  const toggle = (id) =>
    setSplitAmong((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const perPerson =
    splitAmong.length > 0 && totalAmount
      ? (Number(totalAmount) / splitAmong.length).toLocaleString('vi-VN')
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amt = Number(totalAmount);
    if (!amt || amt <= 0) return setError('Enter a valid amount');
    if (splitAmong.length < 1) return setError('Select at least one person');

    setLoading(true);
    try {
      const res = await api.post(`/boards/${board._id}/expenses`, {
        label: label.trim(),
        totalAmount: amt,
        splitAmong,
        isSplit: true,
      });
      onAdded(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add Split Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Cà phê, Bánh mì, ..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₫)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="e.g. 100000"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Split Among</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {everyone.map((u) => (
                <label key={u._id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={splitAmong.includes(u._id)}
                    onChange={() => toggle(u._id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name[0].toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-700">
                    {u.name} {u.isHost && <span className="text-indigo-400 text-xs">(host)</span>}
                  </span>
                </label>
              ))}
            </div>
            {perPerson && (
              <p className="text-xs text-gray-500 mt-2">
                Each person pays: <strong>{perPerson} ₫</strong>
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
