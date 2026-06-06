import Groq from 'groq-sdk';
import { addTransaction, getTransactions, getSpentByCategory, getSpentByMonths, updateTransaction, deleteTransaction } from '../transactions';
import { getBudgetSummary } from '../budget';
import { addDebt, getDebts } from '../debts';
import { TransactionInsert } from '../../types';

export const toolDefinitions: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: 'Records a new expense in the database. Use it when the user mentions a purchase, payment, or expense.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Use today if not specified.' },
          category: { type: 'string', description: 'Expense category. Options: Arriendo, Supermercado, Verdurería, Entretenimiento y restaurantes, Suscripciones, Transporte, Medicamentos y Medicina, Cuenta de luz, Cuenta de agua, Telefonía, Cuenta de internet hogar, Gastos comunes edificio, Lavandería, Agua, Otros.' },
          description: { type: 'string', description: 'Short description of the expense.' },
          amount: { type: 'number', description: 'Amount in Chilean pesos (CLP). Example: 25000.' },
          payment_method: { type: 'string', description: 'Payment method: TC Santander, TC CMR, Débito, Transferencia, Efectivo.' },
          is_fixed: { type: 'boolean', description: 'True if this is a recurring monthly fixed expense.' },
          notes: { type: 'string', description: 'Optional additional notes.' },
        },
        required: ['date', 'category', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description: 'Queries recorded expenses with optional filters by month and category. Also use this before delete_transaction or update_transaction to find the transaction ID.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Month in YYYY-MM format. Defaults to current month.' },
          category: { type: 'string', description: 'Filter by specific category.' },
          limit: { type: 'number', description: 'Maximum number of results to return.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description: 'Updates fields of an existing transaction. Use get_transactions first to find the ID. Only include fields you want to change.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID to update.' },
          date: { type: 'string', description: 'New date in YYYY-MM-DD format.' },
          category: { type: 'string', description: 'New category.' },
          description: { type: 'string', description: 'New description.' },
          amount: { type: 'number', description: 'New amount in CLP.' },
          payment_method: { type: 'string', description: 'New payment method.' },
          notes: { type: 'string', description: 'New notes.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_transaction',
      description: 'Deletes a transaction permanently. Use get_transactions first to find the ID and confirm with the user which one to delete.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID to delete.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_budget_summary',
      description: 'Returns budget vs actual spending by category for a given month.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Month in YYYY-MM format. Defaults to current month if not specified.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_months',
      description: 'Compares total spending and spending by category between two months. Use when the user asks if they spent more or less than a previous month.',
      parameters: {
        type: 'object',
        properties: {
          month_a: { type: 'string', description: 'First month in YYYY-MM format (the older one).' },
          month_b: { type: 'string', description: 'Second month in YYYY-MM format (the newer one).' },
        },
        required: ['month_a', 'month_b'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_spending_trend',
      description: 'Returns monthly spending totals for the last N months, optionally filtered by category. Use for trend questions like "how has my spending changed?".',
      parameters: {
        type: 'object',
        properties: {
          months: { type: 'number', description: 'Number of months to look back. Default 3.' },
          category: { type: 'string', description: 'Filter by specific category. Omit for overall spending.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_debt',
      description: 'Records a debt. Positive amount = someone owes you. Negative amount = you owe someone.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Name of the person.' },
          amount: { type: 'number', description: 'Positive if they owe you, negative if you owe them.' },
          description: { type: 'string', description: 'Description of the debt.' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format.' },
        },
        required: ['person', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_debt_summary',
      description: 'Returns the list of pending debts — who owes you and who you owe.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

function currentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

function pastMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().substring(0, 7));
  }
  return months;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === 'add_transaction') {
    const tx = await addTransaction({
      date: (args.date as string) || today(),
      category: args.category as string,
      description: (args.description as string) || null,
      amount: args.amount as number,
      payment_method: (args.payment_method as string) || null,
      is_fixed: (args.is_fixed as boolean) || false,
      notes: (args.notes as string) || null,
      registered: false,
    });
    return { success: true, id: tx.id, message: `Gasto registrado: ${tx.description || tx.category} por $${tx.amount.toLocaleString('es-CL')}` };
  }

  if (name === 'get_transactions') {
    const month = (args.month as string) || currentMonth();
    const txs = await getTransactions(month, args.category as string | undefined);
    const limited = args.limit ? txs.slice(0, args.limit as number) : txs.slice(0, 20);
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    return { transactions: limited, total, count: txs.length };
  }

  if (name === 'update_transaction') {
    const { id, ...updates } = args;
    const tx = await updateTransaction(id as string, updates as Partial<TransactionInsert>);
    return { success: true, transaction: tx, message: `Gasto actualizado: ${tx.description || tx.category} por $${tx.amount.toLocaleString('es-CL')}` };
  }

  if (name === 'delete_transaction') {
    await deleteTransaction(args.id as string);
    return { success: true, message: 'Gasto eliminado correctamente.' };
  }

  if (name === 'get_budget_summary') {
    const month = (args.month as string) || currentMonth();
    const summary = await getBudgetSummary(month);
    const totalSpent = summary.reduce((s, i) => s + i.spent, 0);
    const totalBudget = summary.reduce((s, i) => s + i.budget, 0);
    return { month, summary, totalSpent, totalBudget };
  }

  if (name === 'compare_months') {
    const monthA = args.month_a as string;
    const monthB = args.month_b as string;
    const [spentA, spentB] = await Promise.all([
      getSpentByCategory(monthA),
      getSpentByCategory(monthB),
    ]);
    const totalA = Object.values(spentA).reduce((s, v) => s + v, 0);
    const totalB = Object.values(spentB).reduce((s, v) => s + v, 0);
    const allCategories = new Set([...Object.keys(spentA), ...Object.keys(spentB)]);
    const byCategory = Array.from(allCategories)
      .map((cat) => ({
        category: cat,
        [monthA]: spentA[cat] ?? 0,
        [monthB]: spentB[cat] ?? 0,
        diff: (spentB[cat] ?? 0) - (spentA[cat] ?? 0),
      }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    return { month_a: monthA, month_b: monthB, total_a: totalA, total_b: totalB, diff: totalB - totalA, by_category: byCategory };
  }

  if (name === 'get_spending_trend') {
    const numMonths = (args.months as number) || 3;
    const category = args.category as string | undefined;
    const months = pastMonths(numMonths);
    const byMonth = await getSpentByMonths(months, category);
    const trend = months.map((m) => ({ month: m, total: byMonth[m] ?? 0 }));
    return { trend, category: category || 'all', months: numMonths };
  }

  if (name === 'add_debt') {
    const debt = await addDebt({
      person: args.person as string,
      amount: args.amount as number,
      description: (args.description as string) || null,
      date: (args.date as string) || today(),
      paid: false,
    });
    const direction = debt.amount > 0 ? `${debt.person} te debe` : `Le debes a ${debt.person}`;
    return { success: true, id: debt.id, message: `${direction} $${Math.abs(debt.amount).toLocaleString('es-CL')}` };
  }

  if (name === 'get_debt_summary') {
    const includePaid = (args.include_paid as boolean) || false;
    const debts = await getDebts(includePaid);
    const totalOwedToMe = debts.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0);
    const totalIOwe = debts.filter((d) => d.amount < 0).reduce((s, d) => s + Math.abs(d.amount), 0);
    return { debts, totalOwedToMe, totalIOwe, count: debts.length };
  }

  return { error: `Unknown tool: ${name}` };
}
