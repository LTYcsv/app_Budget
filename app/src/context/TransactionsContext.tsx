import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type ApiCategory, type ApiTransaction, type TransactionType } from '@/lib/api';

type CategoryType = Exclude<TransactionType, 'transfer'>;

export type Category = {
  id: string;
  group: string;
  name: string;
  icon: string;
  is_other: boolean;
  parent_id?: string | null;
  sort_order?: number;
  is_hidden?: boolean;
  is_custom?: boolean;
};

type CategoriesState = Record<CategoryType, Category[]>;

export type Transaction = {
  id: string;
  name: string;
  amount: number;
  account_id?: string | null;
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
  addCategory: (
    type: CategoryType,
    category: Omit<Category, 'id' | 'is_other'> & { parent_id?: string }
  ) => Promise<void>;
  deleteCategory: (type: CategoryType, categoryId: string) => Promise<void>;
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

function normalizeCategory(item: ApiCategory): Category {
  return {
    id: item.id,
    group: item.group,
    name: item.name,
    icon: item.icon,
    is_other: item.is_other,
    parent_id: item.parent_id ?? null,
    sort_order: item.sort_order ?? 0,
    is_hidden: item.is_hidden ?? false,
    is_custom: item.is_custom ?? false,
  };
}

function normalizeCategories(input: Record<CategoryType, ApiCategory[]>): CategoriesState {
  return {
    expense: (input.expense || []).map(normalizeCategory),
    income: (input.income || []).map(normalizeCategory),
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
        const created = await api.createCategory(type, {
          group: category.group,
          name: category.name,
          icon: category.icon,
          parent_id: category.parent_id,
        });
        setCategories((prev) => ({
          ...prev,
          [type]: [...prev[type], normalizeCategory(created)],
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
