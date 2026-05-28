import { useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

const fmt = (n) =>
  typeof n === 'number' && n > 0 ? n.toLocaleString('vi-VN') + ' ₫' : '—';

function getPeople(board) {
  return [{ ...board.hostId, isHost: true }, ...board.participantIds];
}

function rowTotal(board, personId) {
  return board.expenses.reduce((s, e) => s + ((e.amounts || {})[personId] || 0), 0);
}

function colTotal(expense, people) {
  return people.reduce((s, p) => s + ((expense.amounts || {})[p._id] || 0), 0);
}

// Small clickable avatar row for selecting who paid
function PayerPicker({ people, value, onChange }) {
  return (
    <div className="flex justify-center gap-0.5 mt-1.5 flex-wrap">
      {people.map((p) => (
        // Outer button has larger hit area (p-1.5 → ~36px) while visual stays w-6 h-6
        <button
          key={p._id}
          type="button"
          title={p.name}
          onClick={() => onChange(p._id)}
          className="p-1.5 rounded-full cursor-pointer"
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white
                         text-xs font-bold transition-all block ${
              value === p._id
                ? 'ring-2 ring-offset-1 ring-offset-slate-900 ring-blue-400 scale-110'
                : 'opacity-40 hover:opacity-80'
            }`}
            style={{ backgroundColor: p.color }}
          >
            {p.name[0].toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ExpenseTable({ board, onBoardUpdate }) {
  const { activeUserId } = useUser();
  const people = getPeople(board);
  const isActive = board.status === 'active';

  // Default new column payer = current user if they're in the board, else host
  const defaultPayer = people.find((p) => p._id === activeUserId)?._id || board.hostId._id;

  const [newCol, setNewCol] = useState({ label: '', amounts: {}, paidBy: defaultPayer });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const setNewAmt = (pid, val) =>
    setNewCol((c) => ({ ...c, amounts: { ...c.amounts, [pid]: val === '' ? '' : Number(val) } }));

  const hasData = Object.values(newCol.amounts).some((v) => v !== '' && Number(v) > 0);

  const submitNew = async () => {
    if (!hasData || submitting) return;
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
        paidBy: newCol.paidBy,
      });
      onBoardUpdate(res.data);
      setNewCol({ label: '', amounts: {}, paidBy: defaultPayer });
    } catch (e) {
      alert(e.displayMessage || e.response?.data?.error || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (exp) => {
    const payerId = exp.paidBy?._id || exp.paidBy || board.hostId._id;
    setEditingId(exp._id);
    setEditData({
      label: exp.label,
      amounts: { ...(exp.amounts || {}) },
      paidBy: payerId,
    });
  };

  const saveEdit = async (expId) => {
    try {
      const res = await api.patch(`/boards/${board._id}/expenses/${expId}`, editData);
      onBoardUpdate(res.data);
      setEditingId(null);
    } catch (e) {
      alert(e.displayMessage || e.response?.data?.error || 'Failed to update');
    }
  };

  const deleteCol = async (expId) => {
    if (!confirm('Delete this expense column?')) return;
    try {
      const res = await api.delete(`/boards/${board._id}/expenses/${expId}`);
      onBoardUpdate(res.data);
    } catch (e) {
      alert(e.displayMessage || e.response?.data?.error || 'Failed to delete');
    }
  };

  const cellInput = (value, onChange, onEnter) => (
    <input
      type="number"
      min="0"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      placeholder="0"
      className="w-24 bg-slate-700 border border-slate-600 text-slate-100 text-xs text-center
                 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );

  // Resolve paidBy for display: may be populated object or plain ID string
  const getPayer = (exp) => {
    if (!exp.paidBy) return null;
    const id = exp.paidBy._id || exp.paidBy;
    return people.find((p) => p._id === id) || null;
  };

  return (
    <div className="rounded-2xl border border-slate-700/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse min-w-full">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-700">
              <th className="text-left px-5 py-3 font-heading font-semibold text-xs text-slate-400
                             uppercase tracking-wider sticky left-0 bg-slate-900/80 min-w-[140px]">
                Name
              </th>

              {board.expenses.map((exp) => {
                const payer = getPayer(exp);
                return (
                  <th key={exp._id} className="px-3 py-2 min-w-[130px] bg-slate-900/80">
                    {editingId === exp._id ? (
                      <>
                        <input
                          value={editData.label}
                          onChange={(e) => setEditData((d) => ({ ...d, label: e.target.value }))}
                          className="w-full bg-slate-700 border border-slate-500 text-slate-100 rounded-lg
                                     px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Label"
                        />
                        <PayerPicker
                          people={people}
                          value={editData.paidBy}
                          onChange={(id) => setEditData((d) => ({ ...d, paidBy: id }))}
                        />
                      </>
                    ) : (
                      <>
                        <span className="block text-xs font-medium text-slate-300 truncate max-w-[110px] mx-auto text-center">
                          {exp.label || <span className="text-slate-600">—</span>}
                        </span>
                        {payer && (
                          <div className="flex items-center justify-center gap-1 mt-1" title={`Paid by ${payer.name}`}>
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: payer.color }}
                            >
                              {payer.name[0].toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500 truncate max-w-[60px]">{payer.name}</span>
                          </div>
                        )}
                      </>
                    )}

                    {isActive && (
                      <div className="flex justify-center gap-2 mt-1.5">
                        {editingId === exp._id ? (
                          <>
                            <button onClick={() => saveEdit(exp._id)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer">
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(exp)}
                              className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                              Edit
                            </button>
                            <button onClick={() => deleteCol(exp._id)}
                              className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
                              Del
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}

              {isActive && (
                <th className="px-3 py-2 min-w-[140px] bg-blue-600/10 border-l border-blue-500/20">
                  <input
                    value={newCol.label}
                    onChange={(e) => setNewCol((c) => ({ ...c, label: e.target.value }))}
                    placeholder="Label"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg
                               px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <PayerPicker
                    people={people}
                    value={newCol.paidBy}
                    onChange={(id) => setNewCol((c) => ({ ...c, paidBy: id }))}
                  />
                  <p className="text-xs text-blue-400/60 mt-1 text-center font-normal">new column</p>
                </th>
              )}

              <th className="px-5 py-3 text-right font-heading font-semibold text-xs text-slate-400
                             uppercase tracking-wider min-w-[110px] bg-slate-900/80">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="bg-slate-800">
            {people.map((person, idx) => (
              <tr key={person._id}
                className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                  idx % 2 === 1 ? 'bg-slate-800/50' : ''
                }`}>

                <td className="px-5 py-3 sticky left-0 bg-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white
                                     text-xs font-bold font-heading shrink-0"
                      style={{ backgroundColor: person.color }}>
                      {person.name[0].toUpperCase()}
                    </span>
                    <span className="font-medium text-slate-200 truncate">{person.name}</span>
                    {person.isHost && (
                      <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/20
                                       rounded-full px-1.5 py-0.5 shrink-0">
                        host
                      </span>
                    )}
                  </div>
                </td>

                {board.expenses.map((exp) => (
                  <td key={exp._id} className="px-3 py-3 text-center">
                    {editingId === exp._id
                      ? cellInput(
                          editData.amounts[person._id],
                          (v) => setEditData((d) => ({
                            ...d,
                            amounts: { ...d.amounts, [person._id]: v === '' ? '' : Number(v) },
                          })),
                          () => saveEdit(exp._id)
                        )
                      : <span className="text-slate-300 tabular-nums">
                          {fmt((exp.amounts || {})[person._id])}
                        </span>
                    }
                  </td>
                ))}

                {isActive && (
                  <td className="px-3 py-2 bg-blue-600/5 border-l border-blue-500/20">
                    {cellInput(
                      newCol.amounts[person._id],
                      (v) => setNewAmt(person._id, v),
                      submitNew
                    )}
                  </td>
                )}

                <td className="px-5 py-3 text-right">
                  <span className="font-heading font-semibold text-slate-100 tabular-nums">
                    {fmt(rowTotal(board, person._id))}
                  </span>
                </td>
              </tr>
            ))}

            {/* Totals row */}
            <tr className="border-t-2 border-slate-600 bg-slate-900/60">
              <td className="px-5 py-3 sticky left-0 bg-slate-900/60 text-xs font-semibold
                             text-slate-500 uppercase tracking-wide">
                Column total
              </td>
              {board.expenses.map((exp) => (
                <td key={exp._id} className="px-3 py-3 text-center font-medium text-slate-300 tabular-nums">
                  {fmt(colTotal(exp, people))}
                </td>
              ))}
              {isActive && <td className="bg-blue-600/5 border-l border-blue-500/20" />}
              <td className="px-5 py-3 text-right font-heading font-bold text-blue-400 tabular-nums">
                {fmt(board.expenses.reduce((s, e) => s + colTotal(e, people), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {isActive && (
        <div className="px-5 py-3 bg-blue-600/5 border-t border-blue-500/20 flex items-center justify-between">
          <p className="text-xs text-slate-500">Enter amounts, select who paid, then press Enter or click Add.</p>
          <button onClick={submitNew} disabled={!hasData || submitting}
            className="btn-primary px-5 py-2 text-xs">
            {submitting ? 'Saving...' : '+ Add Column'}
          </button>
        </div>
      )}
    </div>
  );
}
