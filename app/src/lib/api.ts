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

// ─── Analytics types ──────────────────────────────────────────────────────────

export type ApiSummary = {
  income: string;
  expense: string;
  balance: string;
  savings_rate: string | null;
  savings_status: 'surplus' | 'deficit' | 'no_income' | null;
};

export type ApiSubcategorySpendItem = {
  name: string;
  icon: string;
  amount: string;
  percent_of_group: string;
};

export type ApiCategorySpendItem = {
  group: string;
  icon: string;
  amount: string;
  percent: string;
  subcategories: ApiSubcategorySpendItem[];
};

export type ApiCategorySpend = {
  total: string;
  items: ApiCategorySpendItem[];
};

export type ApiCategoryTrendItem = {
  group: string;
  icon: string;
  current_amount: string;
  prev_amount: string;
  trend_percent: string | null;
  direction: 'up' | 'down' | 'stable' | 'new';
};

export type ApiCategoryTrends = {
  date_from: string;
  date_to: string;
  prev_date_from: string;
  prev_date_to: string;
  items: ApiCategoryTrendItem[];
};

// ─── Savings types ────────────────────────────────────────────────────────────

export type ApiFeasibility = 'easily' | 'feasible' | 'hard' | 'unrealistic' | 'no_data';

export type ApiGoalForecast = {
  monthly_avg_balance: string;
  required_monthly: string;
  months_to_deadline: number | null;
  feasibility: ApiFeasibility;
  feasibility_label_ru: string;
};

export type ApiGoal = {
  id: string;
  name: string;
  photo_url: string | null;
  target_amount: string;
  current_amount: string;
  deadline: string | null;
  status: 'active' | 'completed';
  created_at: string;
  progress_percent: string;
  forecast: ApiGoalForecast | null;
};

export type ApiGoalsList = {
  active: ApiGoal[];
  completed: ApiGoal[];
};

export type ApiDeposit = {
  id: string;
  goal_id: string;
  amount: string;
  note: string | null;
  created_at: string;
};

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── Core ─────────────────────────────────────────────────────────────────────

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

async function parseError(response: Response): Promise<never> {
  let message = `API request failed: ${response.status}`;
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') message = data.detail;
    else if (data?.detail) message = JSON.stringify(data.detail);
  } catch {
    const text = await response.text();
    if (text) message = text;
  }
  throw new ApiError(response.status, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!response.ok) await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  // Transactions & categories
  getBootstrap: () => request<BootstrapResponse>('/bootstrap'),
  createTransaction: (payload: Omit<ApiTransaction, 'id'>) =>
    request<ApiTransaction>('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id: string, payload: Omit<ApiTransaction, 'id'>) =>
    request<ApiTransaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTransaction: (id: string) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  createCategory: (type: TransactionType, payload: Pick<ApiCategory, 'group' | 'name' | 'icon'>) =>
    request<ApiCategory>(`/categories/${type}`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteCategory: (type: TransactionType, id: string) =>
    request<void>(`/categories/${type}/${id}`, { method: 'DELETE' }),

  // Analytics
  getSummary: (dateFrom: string, dateTo: string) =>
    request<ApiSummary>(`/analytics/summary?date_from=${dateFrom}&date_to=${dateTo}`),
  getCategorySpend: (dateFrom: string, dateTo: string) =>
    request<ApiCategorySpend>(`/analytics/category-spend?date_from=${dateFrom}&date_to=${dateTo}`),
  getCategoryTrends: (dateFrom: string, dateTo: string, prevDateFrom?: string, prevDateTo?: string) => {
    let url = `/analytics/category-trends?date_from=${dateFrom}&date_to=${dateTo}`;
    if (prevDateFrom) url += `&prev_date_from=${prevDateFrom}`;
    if (prevDateTo) url += `&prev_date_to=${prevDateTo}`;
    return request<ApiCategoryTrends>(url);
  },

  // Savings
  getGoals: () => request<ApiGoalsList>('/savings'),
  createGoal: (payload: { name: string; target_amount: number; deadline?: string | null; photo_url?: string | null }) =>
    request<ApiGoal>('/savings', { method: 'POST', body: JSON.stringify(payload) }),
  deleteGoal: (id: string) => request<void>(`/savings/${id}`, { method: 'DELETE' }),
  completeGoal: (id: string) => request<ApiGoal>(`/savings/${id}/complete`, { method: 'POST' }),
  addDeposit: (goalId: string, payload: { amount: number; note?: string | null }) =>
    request<ApiGoal>(`/savings/${goalId}/deposits`, { method: 'POST', body: JSON.stringify(payload) }),
  getDeposits: (goalId: string) => request<ApiDeposit[]>(`/savings/${goalId}/deposits`),
};
