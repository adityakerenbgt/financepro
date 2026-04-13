// ============================================================
// FinancePro Type Definitions
// Used across API responses and frontend components
// ============================================================

export interface TransactionInput {
  date: string;         // DD/MM/YYYY or YYYY-MM-DD
  category: string;     // Category name
  description: string;
  account: string;      // Account name
  type: 'Pemasukan' | 'Pengeluaran';
  amount: number;
  note?: string;
}

export interface SavingsInput {
  date: string;
  assetType: string;
  instrumentName: string;
  transactionType: 'Buy' | 'Sell' | 'Withdraw' | 'Goals';
  nominal: number;
  pricePerUnit?: number;
  account: string;
  notes?: string;
}

export interface DebtInput {
  debtType: 'Revolving' | 'Fixed';
  debtName: string;
  limitOrPrincipal: number;
  interestRate?: number;
  tenor?: number;
  monthlyPayment?: number;
  startDate?: string;
}

export interface BudgetInput {
  month: string;
  category: string;
  amount: number;
}

export interface GoalInput {
  goalName: string;
  targetAmount: number;
  targetDate: string;
}

export interface AssetInput {
  assetType: string;
  instrumentName: string;
  initialCapital: number;
  currentValue: number;
  startDate?: string;
}

// ---- Computed / API Response Types ----

export interface DebtSummary {
  id: string;
  debtType: string;
  debtName: string;
  limitOrPrincipal: number;
  interestRate: number;
  totalSpent: number;       // computed from transactions
  totalPaid: number;        // computed from transactions
  remainingDebt: number;
  remainingLimit?: number;  // for revolving
  status: string;
  isPiutang?: boolean;      // true = I lent money to someone
}

export interface AssetSummary {
  id: string;
  assetType: string;
  instrumentName: string;
  initialCapital: number;
  totalCapital: number;     // initial + buys - sells
  currentValue: number;
  profitLoss: number;
  returnPercentage: number;
  lastUpdated: string;
}

export interface BudgetSummary {
  id: string;
  category: string;
  month: string;
  budgetAmount: number;
  realisation: number;      // sum of expenses in that category/month
  difference: number;
  status: 'Aman' | 'Hampir Over' | 'Over Budget';
  percentage: number;
}

export interface GoalSummary {
  id: string;
  goalName: string;
  targetAmount: number;
  targetDate: string;
  accumulatedAmount: number;  // sum of Goals-type savings
  remaining: number;
  progress: number;
  status: 'On Track' | 'Tercapai' | 'Gagal';
}

export interface DailyReport {
  date: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  averagePerTransaction: number;
  largestCategory: string;
  smallestCategory: string;
  transactions: {
    id: string;
    txId: string;
    category: string;
    description: string;
    account: string;
    type: string;
    amount: number;
    note?: string;
  }[];
}

export interface WeeklyComparison {
  thisWeekLabel: string;
  lastWeekLabel: string;
  totalThis: number;
  totalLast: number;
  difference: number;
  percentageChange: number;
  trend: string;
  categories: {
    category: string;
    thisWeek: number;
    lastWeek: number;
    change: number;
    changeLabel: string;
  }[];
}

export interface MonthlyReport {
  month: string;
  income: number;
  expense: number;
  savings: number;
  savingsPercentage: number;
  investment: number;
  goalSavings: number;
  debtPayment: number;
  newDebt: number;
  beginningBalance: number;
  endingBalance: number;
  transactions: {
    id: string;
    txId: string;
    date: string;
    category: string;
    description: string;
    account: string;
    type: string;
    amount: number;
    source: string;
  }[];
  categoryBreakdown: {
    category: string;
    budget: number;
    actual: number;
    percentage: number;
  }[];
}

export interface DashboardData {
  kpi: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    newDebt: number;
    accountTurnover: number;
    budgetRealisation: number;
  };
  moneyFlow: { period: string; income: number; expense: number }[];
  spendingOverview: { category: string; amount: number }[];
  expensesSummary: { category: string; budget: number; actual: number; percentage: number }[];
  investmentSummary: { assetType: string; value: number }[];
  goalsProgress: { name: string; target: number; current: number; progress: number }[];
  tips: string[];
}
