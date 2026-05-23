import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(() => localStorage.getItem('activeUserId'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectUser = (id) => {
    setActiveUserId(id);
    localStorage.setItem('activeUserId', id);
  };

  const activeUser = users.find((u) => u._id === activeUserId) || null;

  const refreshUsers = () =>
    api.get('/users').then((res) => setUsers(res.data));

  return (
    <UserContext.Provider value={{ users, activeUser, activeUserId, selectUser, loading, refreshUsers }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
