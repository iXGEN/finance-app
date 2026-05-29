import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { addTransaction, getTransactions } from '../transactions';
import { getBudgetSummary } from '../budget';
import { addDebt } from '../debts';

export const toolDefinitions: FunctionDeclaration[] = [
  {
    name: 'add_transaction',
    description: 'Records a new expense in the database. Use it when the user mentions a purchase, payment, or expense.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: { type: SchemaType.STRING, description: 'Date in YYYY-MM-DD format. Use today if not specified.' },
        category: { type: SchemaType.STRING, description: 'Expense category. Options: Arriendo, Supermercado, Verdurería, Entretenimiento y restaurantes, Suscripciones, Transporte, Medicamentos y Medicina, Cuenta de luz, Cuenta de agua, Telefonía, Cuenta de internet hogar, Gastos comunes edificio, Lavandería, Agua, Otros.' },
        description: { type: SchemaType.STRING, description: 'Short description of the expense.' },
        amount: { type: SchemaType.NUMBER, description: 'Amount in Chilean pesos (CLP). Example: 25000.' },
        payment_method: { type: SchemaType.STRING, description: 'Payment method: TC Santander, TC CMR, Débito, Transferencia, Efectivo.' },
        is_fixed: { type: SchemaType.BOOLEAN, description: 'True if this is a recurring monthly fixed expense.' },
        notes: { type: SchemaType.STRING, description: 'Optional additional notes.' },
      },
      required: ['date', 'category', 'amount'],
    },
  },
  {
    name: 'get_transactions',
    description: 'Queries recorded expenses with optional filters by month and category.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month: { type: SchemaType.STRING, description: 'Month in YYYY-MM format. Defaults to current month.' },
        category: { type: SchemaType.STRING, description: 'Filter by specific category.' },
        limit: { type: SchemaType.NUMBER, description: 'Maximum number of results to return.' },
      },
    },
  },
  {
    name: 'get_budget_summary',
    description: 'Returns budget vs actual spending by category for a given month.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month: { type: SchemaType.STRING, description: 'Month in YYYY-MM format.' },
      },
      required: ['month'],
    },
  },
  {
    name: 'add_debt',
    description: 'Records a debt. Positive amount = someone owes you. Negative amount = you owe someone.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        person: { type: SchemaType.STRING, description: 'Name of the person.' },
        amount: { type: SchemaType.NUMBER, description: 'Positive if they owe you, negative if you owe them.' },
        description: { type: SchemaType.STRING, description: 'Description of the debt.' },
        date: { type: SchemaType.STRING, description: 'Date in YYYY-MM-DD format.' },
      },
      required: ['person', 'amount'],
    },
  },
];

function currentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

function today(): string {
  return new Date().toISOString().substring(0, 10);
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
    return { success: true, id: tx.id, message: `Expense recorded: ${tx.description || tx.category} for $${tx.amount.toLocaleString('es-CL')}` };
  }

  if (name === 'get_transactions') {
    const month = (args.month as string) || currentMonth();
    const txs = await getTransactions(month, args.category as string | undefined);
    const limited = args.limit ? txs.slice(0, args.limit as number) : txs.slice(0, 20);
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    return { transactions: limited, total, count: txs.length };
  }

  if (name === 'get_budget_summary') {
    const month = (args.month as string) || currentMonth();
    const summary = await getBudgetSummary(month);
    const totalSpent = summary.reduce((s, i) => s + i.spent, 0);
    const totalBudget = summary.reduce((s, i) => s + i.budget, 0);
    return { month, summary, totalSpent, totalBudget };
  }

  if (name === 'add_debt') {
    const debt = await addDebt({
      person: args.person as string,
      amount: args.amount as number,
      description: (args.description as string) || null,
      date: (args.date as string) || today(),
      paid: false,
    });
    const direction = debt.amount > 0 ? `${debt.person} owes you` : `You owe ${debt.person}`;
    return { success: true, id: debt.id, message: `${direction} $${Math.abs(debt.amount).toLocaleString('es-CL')}` };
  }

  return { error: `Unknown tool: ${name}` };
}
