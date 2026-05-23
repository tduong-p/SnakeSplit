import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

const fmt = (n) => n.toLocaleString('vi-VN') + ' ₫';

function Avatar({ user, size = 'sm' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  return (
    <span
      className={`${s} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ backgroundColor: user?.color || '#6366f1' }}
    >
      {user?.name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

export default function Home() {
  const { users, activeUser, activeUserId, selectUser } = useUser();
  const [settlements, setSettlements] = useState([]);
  const [viewingId, setViewingId] = useState(activeUserId);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const fetchDebts = useCallback(() => {
    if (!viewingId) return;
    setLoading(true);
    api.get('/debts')
      .then((res) => setSettlements(res.data.settlements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [viewingId]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);
  useEffect(() => { setViewingId(activeUserId); }, [activeUserId]);

  const handleConfirm = async (s) => {
    setConfirming(`${s.from._id}-${s.to._id}`);
    try {
      await api.post('/debts/confirm', {
        fromUserId: s.from._id,
        toUserId: s.to._id,
        amount: s.amount,
      });
      fetchDebts();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to confirm');
    } finally {
      setConfirming(null);
    }
  };

  const viewingUser = users.find((u) => u._id === viewingId);
  const myOwes = settlements.filter((s) => s.from._id === viewingId);
  const owedToMe = settlements.filter((s) => s.to._id === viewingId);

  return (
    <div>
      {/* Viewing-as selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-gray-500 font-medium">Viewing as:</span>
        <select
          value={viewingId || ''}
          onChange={(e) => {
            setViewingId(e.target.value);
            selectUser(e.target.value);
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="" disabled>Select user</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
        {viewingUser && <Avatar user={viewingUser} />}
      </div>

      {!viewingId ? (
        <div className="text-center py-16 text-gray-400">Select a user to see their debts.</div>
      ) : loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500 font-medium">All settled up!</p>
          <p className="text-gray-400 text-sm mt-1">No pending debts across any boards.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* You owe */}
          {myOwes.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {viewingUser?.name} owes
              </h2>
              <div className="space-y-3">
                {myOwes.map((s) => (
                  <DebtCard
                    key={`${s.from._id}-${s.to._id}`}
                    settlement={s}
                    isOwed={false}
                    viewingId={viewingId}
                    onConfirm={handleConfirm}
                    confirming={confirming}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Owed to you */}
          {owedToMe.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Owed to {viewingUser?.name}
              </h2>
              <div className="space-y-3">
                {owedToMe.map((s) => (
                  <DebtCard
                    key={`${s.from._id}-${s.to._id}`}
                    settlement={s}
                    isOwed={true}
                    viewingId={viewingId}
                    onConfirm={handleConfirm}
                    confirming={confirming}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Others (not involving viewing user) */}
          {settlements.filter((s) => s.from._id !== viewingId && s.to._id !== viewingId).length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Other settlements
              </h2>
              <div className="space-y-3">
                {settlements
                  .filter((s) => s.from._id !== viewingId && s.to._id !== viewingId)
                  .map((s) => (
                    <DebtCard
                      key={`${s.from._id}-${s.to._id}`}
                      settlement={s}
                      isOwed={false}
                      viewingId={viewingId}
                      onConfirm={handleConfirm}
                      confirming={confirming}
                    />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DebtCard({ settlement: s, isOwed, viewingId, onConfirm, confirming }) {
  const key = `${s.from._id}-${s.to._id}`;
  const isReceiver = s.to._id === viewingId;

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${
      isOwed ? 'border-green-200 bg-green-50' : s.from._id === viewingId ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center gap-3">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: s.from.color }}
        >
          {s.from.name[0].toUpperCase()}
        </span>
        <div className="text-sm">
          <span className="font-medium text-gray-800">{s.from.name}</span>
          <span className="text-gray-400 mx-2">→</span>
          <span className="font-medium text-gray-800">{s.to.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-bold text-gray-800">{s.amount.toLocaleString('vi-VN')} ₫</span>
        {isReceiver && (
          <button
            onClick={() => onConfirm(s)}
            disabled={confirming === key}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {confirming === key ? '...' : 'Confirm Receipt'}
          </button>
        )}
      </div>
    </div>
  );
}
