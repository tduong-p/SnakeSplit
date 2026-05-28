import { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

export default function CreateBoardModal({ onClose, onCreate }) {
  const { users } = useUser();
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [date, setDate] = useState(today);
  const [hostId, setHostId] = useState('');
  const [participantIds, setParticipantIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const eligible = users.filter((u) => u._id !== hostId);

  const toggle = (id) =>
    setParticipantIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleHostChange = (id) => {
    setHostId(id);
    setParticipantIds((p) => p.filter((x) => x !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Board name is required');
    if (!hostId) return setError('Please select a host');
    if (!participantIds.length) return setError('Select at least one participant');
    setLoading(true);
    try {
      const res = await api.post('/boards', { name, date, hostId, participantIds });
      onCreate(res.data);
    } catch (err) {
      setError(err.displayMessage || err.response?.data?.error || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="card w-full sm:max-w-md p-6 shadow-2xl rounded-b-none sm:rounded-2xl
                      max-h-[92dvh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-lg font-bold text-slate-50">Create Board</h2>
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
              Board Name
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Coffee, Dinner, Grab..." className="input-dark" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Date
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="input-dark [color-scheme:dark]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Host (paid upfront)
            </label>
            <select value={hostId} onChange={(e) => handleHostChange(e.target.value)}
              className="input-dark cursor-pointer">
              <option value="">Select host</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>

          {hostId && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Participants
              </label>
              {eligible.length === 0 ? (
                <p className="text-sm text-slate-500">No other members available.</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {eligible.map((u) => (
                    <label key={u._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                                 hover:bg-slate-700/60 transition-colors">
                      <input type="checkbox" checked={participantIds.includes(u._id)}
                        onChange={() => toggle(u._id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500
                                   focus:ring-blue-500 focus:ring-offset-0 cursor-pointer" />
                      <span className="w-7 h-7 rounded-full flex items-center justify-center
                                       text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: u.color }}>
                        {u.name[0].toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-200">{u.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
