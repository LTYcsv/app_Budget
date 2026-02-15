import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Analytics } from '@/pages/Analytics';
import { Goals } from '@/pages/Goals';
import { AddTransaction } from '@/pages/AddTransaction';
import { Profile } from '@/pages/Profile';
import { Achievements } from '@/pages/Achievements';
import { Transactions } from '@/pages/Transactions';
import { TransactionsProvider } from '@/context/TransactionsContext';

function App() {
  return (
    <TransactionsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="goals" element={<Goals />} />
            <Route path="add" element={<AddTransaction />} />
            <Route path="profile" element={<Profile />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="transactions" element={<Transactions />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TransactionsProvider>
  );
}

export default App;
