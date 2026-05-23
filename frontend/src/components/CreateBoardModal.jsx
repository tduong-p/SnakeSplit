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

  const eligibleParticipants = users.filter((u) => u._id !== hostId);

  const toggleParticipant = (id) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleHostChange = (id) => {
    setHostId(id);
    setParticipantIds((prev) => prev.filter((p) => p !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Board name is required');
    if (!hostId) return setError('Please select a host');
    if (participantIds.length === 0) return setError('Select at least one participant');

    setLoading(true);
    try {
      const res = await api.post('/boards', { name, date, hostId, participantIds });
      onCreate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Create Board</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Board Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Coffee, Dinner, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Host (paid upfront)</label>
            <select
              value={hostId}
              onChange={(e) => handleHostChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Select host</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>

          {hostId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
              {eligibleParticipants.length === 0 ? (
                <p className="text-sm text-gray-400">No other members available</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {eligibleParticipants.map((u) => (
                    <label key={u._id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participantIds.includes(u._id)}
                        onChange={() => toggleParticipant(u._id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.name[0].toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-700">{u.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

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
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
