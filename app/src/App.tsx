import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Analytics } from '@/pages/Analytics';
import { Goals } from '@/pages/Goals';
import { AddTransaction } from '@/pages/AddTransaction';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';
import { Achievements } from '@/pages/Achievements';
import { Transactions } from '@/pages/Transactions';
import { Accounts } from '@/pages/Accounts';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { TransactionsProvider } from '@/context/TransactionsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { setAuthHandlers } from '@/lib/api';
import { Toaster } from '@/components/ui/sonner';
import { LangProvider } from '@/context/LangContext';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, logout } = useAuth();

  // Called synchronously during render so _getToken is set before any child useEffect fires
  setAuthHandlers(() => token, logout);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <TransactionsProvider>
      {children}
    </TransactionsProvider>
  );
}

function App() {
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isLight = saved !== null ? saved === 'light' : false;
    if (isLight) document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, []);

  return (
    <LangProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
    </LangProvider>
  );
}

export default App;
