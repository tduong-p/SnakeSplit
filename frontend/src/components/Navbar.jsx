import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function Navbar() {
  const { users, activeUser, selectUser } = useUser();
  const location = useLocation();

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo + Links */}
        <div className="flex items-center gap-1">
          <span className="font-heading font-bold text-lg text-white mr-3 tracking-tight">
            Snake<span className="text-blue-500">Split</span>
          </span>
          {[
            { to: '/', label: 'Settlement' },
            { to: '/boards', label: 'Boards' },
            { to: '/members', label: 'Members' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive(to)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* User selector */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={activeUser?._id || ''}
            onChange={(e) => selectUser(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg
                       px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
                       hover:bg-slate-700 transition-colors"
          >
            <option value="" disabled>Select user</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>

          {activeUser && (
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white
                         text-xs font-bold font-heading shrink-0 ring-2 ring-slate-700"
              style={{ backgroundColor: activeUser.color }}
            >
              {activeUser.name[0].toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
