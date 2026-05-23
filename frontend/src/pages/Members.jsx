import { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

const PRESET_COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#8b5cf6','#14b8a6',
  '#f97316','#84cc16',
];

export default function Members() {
  const { users, refreshUsers, selectUser, activeUserId } = useUser();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true); setAddError('');
    try {
      await api.post('/users', { name: newName.trim(), color: newColor });
      await refreshUsers();
      setNewName('');
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add member');
    } finally { setAdding(false); }
  };

  const startEdit = (user) => {
    setEditingId(user._id); setEditName(user.name); setEditColor(user.color); setEditError('');
  };

  const cancelEdit = () => { setEditingId(null); setEditError(''); };

  const handleSave = async (id) => {
    if (!editName.trim()) return;
    setSaving(true); setEditError('');
    try {
      await api.patch(`/users/${id}`, { name: editName.trim(), color: editColor });
      await refreshUsers();
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this member?')) return;
    setDeletingId(id); setDeleteError('');
    try {
      await api.delete(`/users/${id}`);
      if (activeUserId === id) selectUser('');
      await refreshUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to remove member');
    } finally { setDeletingId(null); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-50">Members</h1>
        <p className="text-sm text-slate-400 mt-0.5">{users.length} member{users.length !== 1 ? 's' : ''} in the group</p>
      </div>

      {/* Add member */}
      <div className="card p-5">
        <h2 className="font-heading text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Add Member
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Name" className="input-dark flex-1" />
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
              title="Pick color"
              className="w-11 h-11 rounded-xl border border-slate-600 cursor-pointer p-1 bg-slate-700" />
            <button type="submit" disabled={adding || !newName.trim()} className="btn-primary">
              {adding ? '...' : 'Add'}
            </button>
          </div>

          {/* Preset swatches */}
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setNewColor(c)}
                className={`w-7 h-7 rounded-full transition-all duration-150 cursor-pointer ${
                  newColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-blue-400 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }} />
            ))}
          </div>

          {addError && <p className="text-red-400 text-sm">{addError}</p>}
        </form>
      </div>

      {/* Member list */}
      <div className="card divide-y divide-slate-700/50">
        {users.length === 0 ? (
          <p className="text-sm text-slate-500 p-5">No members yet.</p>
        ) : (
          users.map((user) => (
            <div key={user._id} className="p-4">
              {editingId === user._id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white
                                     font-bold font-heading text-sm shrink-0"
                      style={{ backgroundColor: editColor }}>
                      {editName?.[0]?.toUpperCase() || '?'}
                    </span>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(user._id)}
                      autoFocus className="input-dark flex-1" />
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                      className="w-11 h-11 rounded-xl border border-slate-600 cursor-pointer p-1 bg-slate-700" />
                  </div>

                  <div className="flex gap-2 flex-wrap pl-13">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                          editColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-blue-400 scale-110' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  {editError && <p className="text-red-400 text-sm">{editError}</p>}

                  <div className="flex gap-2">
                    <button onClick={() => handleSave(user._id)} disabled={saving || !editName.trim()}
                      className="btn-primary px-5">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white
                                     font-bold font-heading text-sm shrink-0"
                      style={{ backgroundColor: user.color }}>
                      {user.name[0].toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{user.name}</span>
                        {user._id === activeUserId && (
                          <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/20
                                           rounded-full px-2 py-0.5 font-medium">
                            you
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(user)}
                      className="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10
                                 rounded-lg transition-all font-medium cursor-pointer">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(user._id)} disabled={deletingId === user._id}
                      className="px-3 py-1.5 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10
                                 rounded-lg transition-all font-medium disabled:opacity-40 cursor-pointer">
                      {deletingId === user._id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {deleteError && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {deleteError}
        </p>
      )}

      <p className="text-xs text-slate-600 text-center">
        Members with active or pending boards cannot be removed.
      </p>
    </div>
  );
}
