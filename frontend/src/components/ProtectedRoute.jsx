import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../api';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    getMe().then((data) => {
      setStatus(data.isAuthenticated ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  if (status === 'loading') {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/" replace />;
  }

  return children;
}
