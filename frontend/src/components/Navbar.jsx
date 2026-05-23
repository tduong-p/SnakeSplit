import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function Navbar() {
  const { users, activeUser, selectUser } = useUser();
  const location = useLocation();

  const navLink = (to, label) => {
    const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-600'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-indigo-600 shadow">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold text-lg tracking-tight">SnakeSplit</span>
          {navLink('/', 'Settlement')}
          {navLink('/boards', 'Boards')}
          {navLink('/members', 'Members')}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-indigo-200 text-sm hidden sm:block">Viewing as:</span>
          <select
            value={activeUser?._id || ''}
            onChange={(e) => selectUser(e.target.value)}
            className="text-sm rounded-md border-0 bg-indigo-700 text-white px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
          >
            <option value="" disabled>Select user</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
          {activeUser && (
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
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
