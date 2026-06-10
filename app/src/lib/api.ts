export type TransactionType = 'expense' | 'income' | 'transfer';

export type ApiCategory = {
  id: string;
  group: string;
  name: string;
  icon: string;
  type: TransactionType;
  is_other: boolean;
  parent_id?: string | null;
  sort_order?: number;
  is_hidden?: boolean;
  is_custom?: boolean;
};

export type ApiTransaction = {
  id: string;
  name: string;
  amount: number | string;
  account_id?: string | null;
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
  categories: Record<'expense' | 'income', ApiCategory[]>;
  total_transactions: number;
};

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

export type ApiFeasibility = 'easily' | 'feasible' | 'hard' | 'unrealistic' | 'no_data';

export type ApiGoalForecast = {
  monthly_avg_balance: string;
  required_monthly: string;
  months_to_deadline: number | null;
  feasibility: ApiFeasibility;
  feasibility_label_ru: string;
  interest_monthly: string | null;
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
  interest_rate: string | null;
  interest_frequency: 'monthly' | 'yearly' | null;
  interest_next_date: string | null;
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

export type ApiAccount = {
  id: string;
  name: string;
  color: string;
  initial_balance: string;
  current_balance: string;
  created_at: string;
};

export type ApiAccountCreate = {
  name: string;
  color: string;
  initial_balance: number;
};

export type ApiTransferCreate = {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  note?: string | null;
  date: string;
  time: string;
};

export type ApiTransferOut = {
  from_transaction_id: string;
  to_transaction_id: string;
  amount: string;
  date: string;
  time: string;
  note: string | null;
};

export type AchievementId =
  | 'first_transaction'
  | 'streak_7'
  | 'streak_30'
  | 'first_goal'
  | 'first_deposit'
  | 'goal_completed'
  | 'transactions_10'
  | 'transactions_100';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type ApiAchievement = {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  unlocked_at: string | null;
};

export type ApiGamification = {
  streak_current: number;
  streak_best: number;
  achievements: ApiAchievement[];
  achievements_unlocked: number;
  achievements_total: number;
  xp_total: number;
};

export type ApiAuthResponse = {
  access_token: string;
  token_type: string;
};

export type ApiUser = {
  id: string;
  email: string;
  is_verified: boolean;
  display_name: string | null;
  avatar: string | null;
};

export type ApiUserUpdate = {
  display_name?: string;
  avatar?: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

let _getToken: (() => string | null) | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setAuthHandlers(getToken: () => string | null, onUnauthorized: () => void) {
  _getToken = getToken;
  _onUnauthorized = onUnauthorized;
}

async function parseError(response: Response): Promise<never> {
  let message = `API request failed: ${response.status}`;
  try {
    const text = await response.text();
    if (text) {
      try {
        const data = JSON.parse(text);
        if (typeof data?.detail === 'string') {
          message = data.detail;
        } else if (Array.isArray(data?.detail)) {
          message = data.detail
            .map((e: { msg?: string; loc?: string[] }) => {
              const field = e.loc?.filter(s => s !== 'body').join('.') ?? '';
              return field ? `${field}: ${e.msg}` : e.msg ?? 'Неизвестная ошибка';
            })
            .join('\n');
        } else if (data?.detail) {
          message = JSON.stringify(data.detail);
        }
      } catch {
        message = text;
      }
    }
  } catch {
    // тело недоступно
  }
  throw new ApiError(response.status, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = _getToken?.();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401) {
      _onUnauthorized?.();
      throw new ApiError(401, 'Сессия истекла. Войди снова.');
    }

    if (!response.ok) await parseError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'Сервер не отвечает. Проверь соединение.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  getBootstrap: () => request<BootstrapResponse>('/bootstrap'),
  getTransactions: (dateFrom: string, dateTo: string) =>
    request<ApiTransaction[]>(`/transactions?date_from=${dateFrom}&date_to=${dateTo}`),
  createTransaction: (payload: Omit<ApiTransaction, 'id'>) =>
    request<ApiTransaction>('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id: string, payload: Omit<ApiTransaction, 'id'>) =>
    request<ApiTransaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTransaction: (id: string) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  clearAllTransactions: () => request<{ deleted: number }>('/transactions', { method: 'DELETE' }),
  createCategory: (type: 'expense' | 'income', payload: Pick<ApiCategory, 'group' | 'name' | 'icon'> & { parent_id?: string }) =>
    request<ApiCategory>(`/categories/${type}`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (type: 'expense' | 'income', id: string, payload: { name?: string; icon?: string; is_hidden?: boolean; sort_order?: number }) =>
    request<ApiCategory>(`/categories/${type}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  toggleCategoryVisibility: (type: 'expense' | 'income', id: string) =>
    request<ApiCategory>(`/categories/${type}/${id}/toggle-visibility`, { method: 'POST' }),
  deleteCategory: (type: 'expense' | 'income', id: string) =>
    request<void>(`/categories/${type}/${id}`, { method: 'DELETE' }),

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

  getGoals: () => request<ApiGoalsList>('/savings'),
  createGoal: (payload: {
    name: string;
    target_amount: number;
    deadline?: string | null;
    photo_url?: string | null;
    interest_rate?: number | null;
    interest_frequency?: 'monthly' | 'yearly' | null;
  }) => request<ApiGoal>('/savings', { method: 'POST', body: JSON.stringify(payload) }),
  deleteGoal: (id: string) => request<void>(`/savings/${id}`, { method: 'DELETE' }),
  completeGoal: (id: string) => request<ApiGoal>(`/savings/${id}/complete`, { method: 'POST' }),
  addDeposit: (goalId: string, payload: { amount: number; note?: string | null; account_id?: string | null }) =>
    request<ApiGoal>(`/savings/${goalId}/deposits`, { method: 'POST', body: JSON.stringify(payload) }),
  getDeposits: (goalId: string) => request<ApiDeposit[]>(`/savings/${goalId}/deposits`),

  getAccounts: () => request<ApiAccount[]>('/accounts'),
  createAccount: (payload: ApiAccountCreate) =>
    request<ApiAccount>('/accounts', { method: 'POST', body: JSON.stringify(payload) }),
  updateAccount: (id: string, payload: ApiAccountCreate) =>
    request<ApiAccount>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAccount: (id: string) => request<void>(`/accounts/${id}`, { method: 'DELETE' }),
  createTransfer: (payload: ApiTransferCreate) =>
    request<ApiTransferOut>('/accounts/transfer', { method: 'POST', body: JSON.stringify(payload) }),

  getGamification: () => request<ApiGamification>('/gamification'),

  getMe: () => request<ApiUser>('/auth/me'),
  updateMe: (payload: ApiUserUpdate) =>
    request<ApiUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),

  forgotPassword: (email: string) =>
    request<{ detail: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, new_password: string) =>
    request<{ detail: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
};
