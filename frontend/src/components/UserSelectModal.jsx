import { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6'];

export default function UserSelectModal() {
  const { users, selectUser, refreshUsers } = useUser();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm p-6 shadow-2xl">

        <div className="mb-6">
          <h2 className="font-heading text-xl font-bold text-slate-50 mb-1">Who are you?</h2>
          <p className="text-sm text-slate-400">Pick your name to continue.</p>
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-slate-500 mb-5">No members yet — add the first one below.</p>
        ) : (
          <div className="space-y-2 mb-5">
            {users.map((u) => (
              <button
                key={u._id}
                onClick={() => selectUser(u._id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700
                           hover:border-blue-500 hover:bg-slate-700/50 transition-all duration-150
                           text-left group cursor-pointer"
              >
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white
                             text-sm font-bold font-heading shrink-0"
                  style={{ backgroundColor: u.color }}
                >
                  {u.name[0].toUpperCase()}
                </span>
                <span className="font-medium text-slate-200 group-hover:text-white transition-colors">
                  {u.name}
                </span>
                <svg className="ml-auto w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-700 pt-4">
          <p className="text-xs text-slate-500 mb-3">Add a new group member</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Name"
              className="input-dark flex-1"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="btn-primary px-4"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
