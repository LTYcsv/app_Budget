export type TransactionType = 'expense' | 'income';

export type ApiCategory = {
  id: string;
  group: string;
  name: string;
  icon: string;
  type: TransactionType;
  is_other: boolean;
};

export type ApiTransaction = {
  id: string;
  name: string;
  amount: number | string;
  category_id?: string | null;
  category_group?: string | null;
  category: string;
  icon: string;
  date: string;
  time: string;
  type: TransactionType;
};

export type BootstrapResponse = {
  transactions: ApiTransaction[];
  categories: Record<TransactionType, ApiCategory[]>;
};

export type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

export type DashboardResponse = {
  period: DashboardPeriod;
  date_from: string;
  date_to: string;
  summary: {
    income: number | string;
    expense: number | string;
    balance: number | string;
  };
  recent_transactions: ApiTransaction[];
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

async function parseError(response: Response): Promise<never> {
  let message = `API request failed: ${response.status}`;
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      message = data.detail;
    } else if (data?.detail) {
      message = JSON.stringify(data.detail);
    }
  } catch {
    const text = await response.text();
    if (text) message = text;
  }
  throw new ApiError(response.status, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getBootstrap: () => request<BootstrapResponse>('/bootstrap'),
  getDashboard: (period: DashboardPeriod) => request<DashboardResponse>(`/analytics/dashboard?period=${period}`),
  createTransaction: (payload: Omit<ApiTransaction, 'id'>) =>
    request<ApiTransaction>('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id: string, payload: Omit<ApiTransaction, 'id'>) =>
    request<ApiTransaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTransaction: (id: string) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  createCategory: (type: TransactionType, payload: Pick<ApiCategory, 'group' | 'name' | 'icon'>) =>
    request<ApiCategory>(`/categories/${type}`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteCategory: (type: TransactionType, id: string) =>
    request<void>(`/categories/${type}/${id}`, { method: 'DELETE' }),
};
