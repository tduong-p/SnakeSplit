import { useState } from 'react';
import api from '../api/axios';

const fmt = (n) =>
  typeof n === 'number' && n > 0
    ? n.toLocaleString('vi-VN') + ' ₫'
    : '—';

// All people in the board: host first, then participants
function getPeople(board) {
  return [{ ...board.hostId, isHost: true }, ...board.participantIds];
}

function rowTotal(board, personId) {
  return board.expenses.reduce((sum, exp) => {
    const amounts = exp.amounts || {};
    return sum + (amounts[personId] || 0);
  }, 0);
}

function colTotal(expense, people) {
  return people.reduce((sum, p) => sum + ((expense.amounts || {})[p._id] || 0), 0);
}

export default function ExpenseTable({ board, onBoardUpdate }) {
  const people = getPeople(board);
  const isActive = board.status === 'active';

  // New column entry state
  const [newCol, setNewCol] = useState({ label: '', amounts: {} });
  const [submitting, setSubmitting] = useState(false);

  // Edit existing column state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleNewAmountChange = (personId, value) => {
    setNewCol((prev) => ({
      ...prev,
      amounts: { ...prev.amounts, [personId]: value === '' ? '' : Number(value) },
    }));
  };

  const hasNewColData = Object.values(newCol.amounts).some((v) => v !== '' && v > 0);

  const submitNewCol = async () => {
    if (!hasNewColData || submitting) return;
    setSubmitting(true);
    try {
      const amounts = {};
      for (const [id, val] of Object.entries(newCol.amounts)) {
        if (val !== '' && Number(val) > 0) amounts[id] = Number(val);
      }
      const res = await api.post(`/boards/${board._id}/expenses`, {
        label: newCol.label,
        amounts,
        isSplit: false,
      });
      onBoardUpdate(res.data);
      setNewCol({ label: '', amounts: {} });
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (expense) => {
    setEditingId(expense._id);
    setEditData({ label: expense.label, amounts: { ...(expense.amounts || {}) } });
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async (expenseId) => {
    try {
      const res = await api.patch(`/boards/${board._id}/expenses/${expenseId}`, {
        label: editData.label,
        amounts: editData.amounts,
      });
      onBoardUpdate(res.data);
      setEditingId(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update expense');
    }
  };

  const deleteCol = async (expenseId) => {
    if (!confirm('Delete this expense column?')) return;
    try {
      const res = await api.delete(`/boards/${board._id}/expenses/${expenseId}`);
      onBoardUpdate(res.data);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete expense');
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="text-sm border-collapse min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[120px]">
              Name
            </th>
            {board.expenses.map((exp) => (
              <th key={exp._id} className="px-3 py-2 text-center font-medium text-gray-600 min-w-[110px]">
                {editingId === exp._id ? (
                  <input
                    value={editData.label}
                    onChange={(e) => setEditData((d) => ({ ...d, label: e.target.value }))}
                    className="w-full border border-indigo-300 rounded px-1 py-0.5 text-xs text-center focus:outline-none"
                    placeholder="Label"
                  />
                ) : (
                  <span className="block truncate max-w-[100px] mx-auto">
                    {exp.label || <span className="text-gray-300">—</span>}
                  </span>
                )}
                {isActive && (
                  <div className="flex justify-center gap-1 mt-1">
                    {editingId === exp._id ? (
                      <>
                        <button onClick={() => saveEdit(exp._id)} className="text-xs text-green-600 hover:underline">Save</button>
                        <button onClick={cancelEdit} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(exp)} className="text-xs text-indigo-400 hover:text-indigo-600">Edit</button>
                        <button onClick={() => deleteCol(exp._id)} className="text-xs text-red-400 hover:text-red-600">Del</button>
                      </>
                    )}
                  </div>
                )}
              </th>
            ))}

            {/* New entry column header */}
            {isActive && (
              <th className="px-3 py-2 min-w-[120px] bg-indigo-50">
                <input
                  value={newCol.label}
                  onChange={(e) => setNewCol((c) => ({ ...c, label: e.target.value }))}
                  placeholder="Label"
                  className="w-full border border-indigo-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                />
              </th>
            )}

            <th className="px-4 py-3 text-right font-semibold text-gray-600 min-w-[100px] bg-gray-50">
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {people.map((person, idx) => (
            <tr
              key={person._id}
              className={`border-b border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
            >
              {/* Name cell */}
              <td className="px-4 py-3 sticky left-0 bg-white font-medium text-gray-800 flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: person.color }}
                >
                  {person.name[0].toUpperCase()}
                </span>
                <span className="truncate">{person.name}</span>
                {person.isHost && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 rounded px-1 shrink-0">host</span>
                )}
              </td>

              {/* Existing expense columns */}
              {board.expenses.map((exp) => (
                <td key={exp._id} className="px-3 py-3 text-center text-gray-700">
                  {editingId === exp._id ? (
                    <input
                      type="number"
                      min="0"
                      value={editData.amounts[person._id] ?? ''}
                      onChange={(e) =>
                        setEditData((d) => ({
                          ...d,
                          amounts: { ...d.amounts, [person._id]: e.target.value === '' ? '' : Number(e.target.value) },
                        }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(exp._id)}
                      className="w-20 border border-indigo-300 rounded px-2 py-1 text-xs text-center focus:outline-none"
                      placeholder="0"
                    />
                  ) : (
                    fmt((exp.amounts || {})[person._id])
                  )}
                </td>
              ))}

              {/* New entry column cells */}
              {isActive && (
                <td className="px-3 py-2 bg-indigo-50/50">
                  <input
                    type="number"
                    min="0"
                    value={newCol.amounts[person._id] ?? ''}
                    onChange={(e) => handleNewAmountChange(person._id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitNewCol()}
                    placeholder="0"
                    className="w-20 border border-indigo-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                  />
                </td>
              )}

              {/* Row total */}
              <td className="px-4 py-3 text-right font-semibold text-gray-800">
                {person.isHost
                  ? <span className="text-gray-400 font-normal text-xs">receives</span>
                  : fmt(rowTotal(board, person._id))}
              </td>
            </tr>
          ))}

          {/* Column totals row */}
          <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
            <td className="px-4 py-3 text-gray-500 text-xs uppercase tracking-wide sticky left-0 bg-gray-50">
              Column total
            </td>
            {board.expenses.map((exp) => (
              <td key={exp._id} className="px-3 py-3 text-center text-gray-700">
                {fmt(colTotal(exp, people))}
              </td>
            ))}
            {isActive && <td className="bg-indigo-50/50" />}
            <td className="px-4 py-3 text-right text-indigo-600">
              {fmt(board.expenses.reduce((s, e) => s + colTotal(e, people), 0))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* New column submit button */}
      {isActive && (
        <div className="px-4 py-3 bg-indigo-50/50 border-t border-indigo-100 flex justify-end">
          <button
            onClick={submitNewCol}
            disabled={!hasNewColData || submitting}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Saving...' : '+ Add Column'}
          </button>
        </div>
      )}
    </div>
  );
}
