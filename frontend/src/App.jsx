import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import UserSelectModal from './components/UserSelectModal';
import Home from './pages/Home';
import Boards from './pages/Boards';
import BoardDetail from './pages/BoardDetail';
import Members from './pages/Members';
import { useUser } from './context/UserContext';

export default function App() {
  const { activeUserId, users, loading } = useUser();
  const needsUserSelect = !loading && (!activeUserId || !users.find((u) => u._id === activeUserId));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {needsUserSelect && <UserSelectModal />}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/boards" element={<Boards />} />
          <Route path="/boards/:id" element={<BoardDetail />} />
          <Route path="/members" element={<Members />} />
        </Routes>
      </main>
    </div>
  );
}
