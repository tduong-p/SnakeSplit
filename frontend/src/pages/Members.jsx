import { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
  '#f97316', '#84cc16',
];

export default function Members() {
  const { users, refreshUsers, selectUser, activeUserId } = useUser();

  // Add new member
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit existing member
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      await api.post('/users', { name: newName.trim(), color: newColor });
      await refreshUsers();
      setNewName('');
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setEditName(user.name);
    setEditColor(user.color);
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleSave = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    setEditError('');
    try {
      await api.patch(`/users/${id}`, { name: editName.trim(), color: editColor });
      await refreshUsers();
      // If the active user just changed their own name/color, keep them selected
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this member? This cannot be undone.')) return;
    setDeletingId(id);
    setDeleteError('');
    try {
      await api.delete(`/users/${id}`);
      if (activeUserId === id) selectUser('');
      await refreshUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete member');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Members</h1>

      {/* Add new member */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Add Member</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              title="Pick avatar color"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>

          {/* Preset color swatches */}
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {addError && <p className="text-red-500 text-sm">{addError}</p>}
        </form>
      </div>

      {/* Member list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {users.length === 0 ? (
          <p className="text-gray-400 text-sm p-5">No members yet.</p>
        ) : (
          users.map((user) => (
            <div key={user._id} className="p-4">
              {editingId === user._id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: editColor }}
                    >
                      {editName?.[0]?.toUpperCase() || '?'}
                    </span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(user._id)}
                      autoFocus
                      className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${editColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  {editError && <p className="text-red-500 text-sm">{editError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(user._id)}
                      disabled={saving || !editName.trim()}
                      className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name[0].toUpperCase()}
                    </span>
                    <div>
                      <span className="font-medium text-gray-800">{user.name}</span>
                      {user._id === activeUserId && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">you</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(user)}
                      className="text-sm text-indigo-500 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user._id)}
                      disabled={deletingId === user._id}
                      className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
                    >
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
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {deleteError}
        </p>
      )}

      <p className="text-xs text-gray-400 text-center">
        Members with active or pending boards cannot be removed.
      </p>
    </div>
  );
}
