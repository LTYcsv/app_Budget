import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Analytics } from '@/pages/Analytics';
import { Goals } from '@/pages/Goals';
import { AddTransaction } from '@/pages/AddTransaction';
import { Profile } from '@/pages/Profile';
import { Achievements } from '@/pages/Achievements';
import { Transactions } from '@/pages/Transactions';
import { Accounts } from '@/pages/Accounts';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { TransactionsProvider } from '@/context/TransactionsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { setAuthHandlers } from '@/lib/api';
import { Toaster } from '@/components/ui/sonner';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, logout } = useAuth();

  useEffect(() => {
    setAuthHandlers(() => token, logout);
  }, [token, logout]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <TransactionsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <AuthGate>
                  <MainLayout />
                </AuthGate>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="goals" element={<Goals />} />
              <Route path="add" element={<AddTransaction />} />
              <Route path="profile" element={<Profile />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="accounts" element={<Accounts />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </TransactionsProvider>
    </AuthProvider>
  );
}

export default App;
