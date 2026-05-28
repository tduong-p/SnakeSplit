import { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

export default function SplitExpenseModal({ board, onClose, onAdded }) {
  const { activeUserId } = useUser();
  const everyone = [{ ...board.hostId, isHost: true }, ...board.participantIds];

  const defaultPayer = everyone.find((u) => u._id === activeUserId)?._id || board.hostId._id;

  const [label, setLabel] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState(defaultPayer);
  const [splitAmong, setSplitAmong] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id) =>
    setSplitAmong((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const perPerson = splitAmong.length > 0 && totalAmount
    ? Math.round(Number(totalAmount) / splitAmong.length)
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
        label: label.trim(), totalAmount: amt, splitAmong, isSplit: true, paidBy,
      });
      onAdded(res.data);
    } catch (err) {
      setError(err.displayMessage || err.response?.data?.error || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const selectAll = () => setSplitAmong(everyone.map((u) => u._id));
  const clearAll = () => setSplitAmong([]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-lg font-bold text-slate-50">Split Expense</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
                       hover:text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Label (optional)
            </label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="Cà phê, Bánh mì, ..." className="input-dark" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Total Amount (₫)
            </label>
            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="100000" min="0" className="input-dark" />
          </div>

          {/* Paid by */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Paid by
            </label>
            <div className="flex gap-2 flex-wrap">
              {everyone.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => setPaidBy(u._id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium
                               transition-all cursor-pointer border ${
                    paidBy === u._id
                      ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                      : 'border-slate-700 bg-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name[0].toUpperCase()}
                  </span>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {/* Split among */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Split Among
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  All
                </button>
                <span className="text-slate-600">·</span>
                <button type="button" onClick={clearAll}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  None
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {everyone.map((u) => (
                <label key={u._id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                             hover:bg-slate-700/60 transition-colors">
                  <input type="checkbox" checked={splitAmong.includes(u._id)}
                    onChange={() => toggle(u._id)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500
                               focus:ring-blue-500 focus:ring-offset-0 cursor-pointer" />
                  <span className="w-7 h-7 rounded-full flex items-center justify-center
                                   text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: u.color }}>
                    {u.name[0].toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-200 flex-1">{u.name}</span>
                  {u.isHost && (
                    <span className="text-xs text-blue-400 font-medium">host</span>
                  )}
                </label>
              ))}
            </div>

            {perPerson !== null && (
              <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl
                              bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-sm text-slate-400">Each person pays</span>
                <span className="font-heading font-bold text-emerald-400">
                  {perPerson.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
