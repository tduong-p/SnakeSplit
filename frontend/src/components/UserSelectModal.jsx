import { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

export default function UserSelectModal() {
  const { users, selectUser, refreshUsers } = useUser();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

  const handleAddMember = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      await api.post('/users', { name: newName.trim(), color });
      await refreshUsers();
      setNewName('');
    } catch {
      setError('Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Who are you?</h2>
        <p className="text-sm text-gray-500 mb-5">Select your name to continue.</p>

        {users.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No members yet. Add the first one below.</p>
        ) : (
          <div className="space-y-2 mb-5">
            {users.map((u) => (
              <button
                key={u._id}
                onClick={() => selectUser(u._id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: u.color }}
                >
                  {u.name[0].toUpperCase()}
                </span>
                <span className="font-medium text-gray-800">{u.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-xs text-gray-400 mb-2">Add a new group member</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              placeholder="Name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={handleAddMember}
              disabled={adding || !newName.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
