import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Settlement',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
      </svg>
    ),
    iconActive: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    to: '/boards',
    label: 'Boards',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    iconActive: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    to: '/members',
    label: 'Members',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    iconActive: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const { users, activeUser, selectUser } = useUser();
  const location = useLocation();

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* Top bar */}
      <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <span className="font-heading font-bold text-lg text-white tracking-tight shrink-0">
            Snake<span className="text-blue-500">Split</span>
          </span>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(to)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}>
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
                         hover:bg-slate-700 transition-colors max-w-[120px] sm:max-w-none"
            >
              <option value="" disabled>Select</option>
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

      {/* Mobile bottom navigation */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {NAV_ITEMS.map(({ to, label, icon, iconActive }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium
                             transition-colors min-h-[56px] justify-center ${
                  active ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}>
                <span className={`transition-transform ${active ? 'scale-110' : ''}`}>
                  {active ? iconActive : icon}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
