import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { TransactionsProvider } from '@/context/TransactionsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { setAuthHandlers } from '@/lib/api';
import { Toaster } from '@/components/ui/sonner';
import { LangProvider } from '@/context/LangContext';

// Code-splitting per-route: тяжёлые страницы (Recharts в Analytics и т.д.)
// не попадают в стартовый бандл. Login/Register — eager: первый экран.
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Analytics = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const Goals = lazy(() => import('@/pages/Goals').then(m => ({ default: m.Goals })));
const AddTransaction = lazy(() => import('@/pages/AddTransaction').then(m => ({ default: m.AddTransaction })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Achievements = lazy(() => import('@/pages/Achievements').then(m => ({ default: m.Achievements })));
const Transactions = lazy(() => import('@/pages/Transactions').then(m => ({ default: m.Transactions })));
const Accounts = lazy(() => import('@/pages/Accounts').then(m => ({ default: m.Accounts })));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('@/pages/ResetPassword').then(m => ({ default: m.ResetPassword })));

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, login, logout } = useAuth();

  // useLayoutEffect runs synchronously after every render, before children's useEffects,
  // ensuring _getToken closure is fresh before any API call fires from child effects.
  useLayoutEffect(() => {
    setAuthHandlers(() => token, logout, login);
  });

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
        <Suspense fallback={null}>
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
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
    </LangProvider>
  );
}

export default App;
