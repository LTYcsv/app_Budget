import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type ApiCategory, type ApiTransaction } from '@/lib/api';

export type TransactionType = 'expense' | 'income';

export type Category = {
  id: string;
  group: string;
  name: string;
  icon: string;
  is_other: boolean;
};

type CategoriesState = Record<TransactionType, Category[]>;

export type Transaction = {
  id: string;
  name: string;
  amount: number;
  category_id?: string | null;
  category_group?: string | null;
  category: string;
  icon: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: TransactionType;
};

type TransactionsContextValue = {
  transactions: Transaction[];
  categories: CategoriesState;
  isLoading: boolean;
  error: string | null;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (type: TransactionType, category: Omit<Category, 'id' | 'is_other'>) => Promise<void>;
  deleteCategory: (type: TransactionType, categoryId: string) => Promise<void>;
  clearTransactions: () => Promise<void>;
  refresh: () => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

function normalizeTransactions(items: ApiTransaction[]): Transaction[] {
  return items.map((item) => ({
    ...item,
    amount: Number(item.amount),
    date: item.date.slice(0, 10),
  }));
}

function normalizeCategories(input: Record<TransactionType, ApiCategory[]>): CategoriesState {
  return {
    expense: (input.expense || []).map((item) => ({
      id: item.id,
      group: item.group,
      name: item.name,
      icon: item.icon,
      is_other: item.is_other,
    })),
    income: (input.income || []).map((item) => ({
      id: item.id,
      group: item.group,
      name: item.name,
      icon: item.icon,
      is_other: item.is_other,
    })),
  };
}

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoriesState>({ expense: [], income: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await api.getBootstrap();
      setTransactions(normalizeTransactions(payload.transactions));
      setCategories(normalizeCategories(payload.categories));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить данные';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<TransactionsContextValue>(() => {
    return {
      transactions,
      categories,
      isLoading,
      error,
      refresh,
      addTransaction: async (tx) => {
        const created = await api.createTransaction(tx);
        setTransactions((prev) => [normalizeTransactions([created])[0], ...prev]);
      },
      updateTransaction: async (id, tx) => {
        const updated = await api.updateTransaction(id, tx);
        const normalized = normalizeTransactions([updated])[0];
        setTransactions((prev) => prev.map((item) => (item.id === id ? normalized : item)));
      },
      deleteTransaction: async (id) => {
        await api.deleteTransaction(id);
        setTransactions((prev) => prev.filter((item) => item.id !== id));
      },
      addCategory: async (type, category) => {
        const created = await api.createCategory(type, category);
        setCategories((prev) => ({
          ...prev,
          [type]: [
            {
              id: created.id,
              group: created.group,
              name: created.name,
              icon: created.icon,
              is_other: created.is_other,
            },
            ...prev[type],
          ],
        }));
      },
      deleteCategory: async (type, categoryId) => {
        await api.deleteCategory(type, categoryId);
        setCategories((prev) => ({
          ...prev,
          [type]: prev[type].filter((cat) => cat.id !== categoryId),
        }));
      },
      clearTransactions: async () => {
        const removeOps = transactions.map((tx) => api.deleteTransaction(tx.id));
        await Promise.all(removeOps);
        setTransactions([]);
      },
    };
  }, [transactions, categories, isLoading, error, refresh]);

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) {
    throw new Error('useTransactions must be used within TransactionsProvider');
  }
  return ctx;
}
