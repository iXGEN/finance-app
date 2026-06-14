import Groq from 'groq-sdk';
import {
  addTransaction, getTransactions, getTransactionById, getSpentByCategory, getSpentByMonths,
  updateTransaction, deleteTransaction, deleteTransactionsBulk,
} from '../transactions';
import { getBudgetSummary, upsertBudget } from '../budget';
import { addDebt, getDebts, markDebtPaid, deleteDebt } from '../debts';
import { TransactionInsert, SplitEntry, encodeSplit, parseSplit } from '../../types';
import { useUserConfigStore } from '../../store/userConfigStore';
import { useLocaleStore } from '../../store/localeStore';
import type { Locale } from '../i18n';
import { today, currentMonth, pastMonths, addMonths } from '../dates';
import { copyBudget } from '../budget';
import { carryOverFixedExpenses, getFixedExpenses } from '../recurring';
import { getMonthlyOverview } from '../insights';

const DEBT_PAYMENT_METHOD = 'Deuda';

export const toolDefinitions: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: 'Records a new expense. Use it when the user mentions a purchase, payment, or expense. For expenses shared with other people use add_split_expense instead.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Use today if not specified.' },
          category: { type: 'string', description: 'Expense category. Prefer one of the user\'s existing categories listed in the system prompt.' },
          description: { type: 'string', description: 'Short description of the expense.' },
          amount: { type: 'number', description: 'Amount in Chilean pesos (CLP). Example: 25000.' },
          payment_method: { type: 'string', description: 'Payment method. Prefer one of the user\'s existing methods. Use "Deuda" when the user paid on behalf of someone who will pay them back.' },
          is_fixed: { type: 'boolean', description: 'True if this is a recurring monthly fixed expense.' },
          debt_person: { type: 'string', description: 'Only when payment_method is "Deuda": the name of the person who owes the user. The full amount is added to Saldos as owed to the user.' },
          notes: { type: 'string', description: 'Optional additional notes.' },
        },
        required: ['date', 'category', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_split_expense',
      description: 'Records a shared/split expense (Tricount-style). The user\'s own share is recorded as the expense; every other participant\'s share is added to Saldos as money they owe the user. Use this whenever an expense is divided among several people.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Use today if not specified.' },
          category: { type: 'string', description: 'Expense category. Prefer one of the user\'s existing categories.' },
          description: { type: 'string', description: 'Short description of the expense.' },
          total_amount: { type: 'number', description: 'The full amount of the expense before splitting, in CLP. Optional if my_part and participants cover the whole amount.' },
          my_part: { type: 'number', description: 'The user\'s own share in CLP. If omitted, it is computed as total_amount minus the sum of the other participants.' },
          participants: {
            type: 'array',
            description: 'The OTHER people the expense is split with (do not include the user). Each owes the user their share.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Person name.' },
                amount: { type: 'number', description: 'That person\'s share in CLP.' },
              },
              required: ['name', 'amount'],
            },
          },
          payment_method: { type: 'string', description: 'Payment method used to pay the expense.' },
          is_fixed: { type: 'boolean', description: 'True if this is a recurring monthly fixed expense.' },
          notes: { type: 'string', description: 'Optional additional notes.' },
        },
        required: ['category', 'participants'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_split_expense',
      description: 'Edits an existing split expense, or converts a normal expense into a split. Re-divides the expense: it deletes the previously linked Saldos and recreates them so everything stays in sync. Use get_transactions first to find the ID. Use this (not update_transaction) whenever the expense is or becomes a split.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID to edit.' },
          total_amount: { type: 'number', description: 'New full amount before splitting, in CLP. If omitted, keeps the current total.' },
          my_part: { type: 'number', description: 'The user\'s own share in CLP. If omitted, computed as total minus the other participants.' },
          participants: {
            type: 'array',
            description: 'The OTHER people the expense is split with (do not include the user). REPLACES the current participants. Omit to keep the existing ones unchanged.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Person name.' },
                amount: { type: 'number', description: 'That person\'s share in CLP.' },
              },
              required: ['name', 'amount'],
            },
          },
          category: { type: 'string', description: 'New category.' },
          date: { type: 'string', description: 'New date in YYYY-MM-DD format.' },
          description: { type: 'string', description: 'New description.' },
          payment_method: { type: 'string', description: 'New payment method.' },
          is_fixed: { type: 'boolean', description: 'Whether the expense is recurring.' },
          notes: { type: 'string', description: 'New free-text notes.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_split',
      description: 'Converts a split expense back into a normal expense: deletes the linked Saldos and restores the full amount. Use get_transactions first to find the ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID to un-split.' },
          amount: { type: 'number', description: 'Amount to keep for the expense in CLP. Defaults to the original total.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description: 'Queries recorded expenses with optional filters by month, category, free text and fixed-only. Also use this before delete_transaction or update_transaction to find the transaction ID.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Month in YYYY-MM format. Defaults to current month.' },
          category: { type: 'string', description: 'Filter by specific category.' },
          query: { type: 'string', description: 'Free-text search across description, payment method, notes and amount (case-insensitive).' },
          only_fixed: { type: 'boolean', description: 'When true, only return recurring fixed expenses (is_fixed).' },
          limit: { type: 'number', description: 'Maximum number of results to return.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_fixed_expenses',
      description: 'Lists the recurring fixed expenses (is_fixed) of a month and their combined monthly total. Use for questions like "what are my fixed expenses?" or "how much do my fixed costs add up to?".',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Month in YYYY-MM format. Defaults to current month.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description: 'Updates fields of a normal (non-split) expense. Use get_transactions first to find the ID. Only include fields you want to change. If the expense is split (it shows participants / "DIVIDIDO"), use update_split_expense instead so the linked Saldos stay in sync.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID to update.' },
          date: { type: 'string', description: 'New date in YYYY-MM-DD format.' },
          category: { type: 'string', description: 'New category.' },
          description: { type: 'string', description: 'New description.' },
          amount: { type: 'number', description: 'New amount in CLP.' },
          payment_method: { type: 'string', description: 'New payment method.' },
          is_fixed: { type: 'boolean', description: 'Set whether the expense is a recurring monthly fixed expense.' },
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
      name: 'delete_all_transactions',
      description: 'Bulk-deletes many expenses in ONE permanent operation. Use this — never a long chain of delete_transaction calls — whenever the user wants to clear/delete several or all expenses. Scope it: a single month (month=YYYY-MM), a category, or the ENTIRE history (all_time=true). This is irreversible: ALWAYS confirm with the user first, and if they did not specify the scope, ask whether they mean the current month or all history before calling.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Limit deletion to this month (YYYY-MM).' },
          category: { type: 'string', description: 'Limit deletion to this category. Can be combined with month.' },
          all_time: { type: 'boolean', description: 'Set true to delete across every month. Required when neither month nor category is given.' },
        },
        required: [],
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
      name: 'set_budget',
      description: 'Sets or updates the monthly budget for a single category. Use when the user wants to assign or change how much they plan to spend in a category.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'The category to budget. Prefer one of the user\'s existing categories.' },
          amount: { type: 'number', description: 'The budget amount in CLP for that category. Use 0 to clear it.' },
          month: { type: 'string', description: 'Month in YYYY-MM format. Defaults to current month.' },
        },
        required: ['category', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'copy_budget',
      description: 'Copies all category budgets from one month to another, skipping categories that already have a budget in the target month. Use when the user wants to reuse a previous month\'s budget.',
      parameters: {
        type: 'object',
        properties: {
          from_month: { type: 'string', description: 'Source month in YYYY-MM. Defaults to the month before to_month.' },
          to_month: { type: 'string', description: 'Target month in YYYY-MM. Defaults to the current month.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'carry_over_fixed',
      description: 'Regenerates recurring fixed expenses (is_fixed) from one month into another. Idempotent: expenses already present (same category, description and amount) are skipped. A split fixed expense is copied as the user\'s own share without recreating Saldos.',
      parameters: {
        type: 'object',
        properties: {
          from_month: { type: 'string', description: 'Source month in YYYY-MM. Defaults to the month before to_month.' },
          to_month: { type: 'string', description: 'Target month in YYYY-MM. Defaults to the current month.' },
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
      name: 'get_month_overview',
      description: 'Returns the full monthly dashboard in one call: total spent, total budget, spending vs the previous month, top categories, a 6-month trend, and the Saldos totals (owed to the user / owed by the user). Prefer this for broad questions like "how am I doing this month?" instead of calling several tools.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Month in YYYY-MM format. Defaults to current month.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_debt',
      description: 'Records a standalone debt in Saldos. Positive amount = someone owes the user. Negative amount = the user owes someone.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Name of the person.' },
          amount: { type: 'number', description: 'Positive if they owe the user, negative if the user owes them.' },
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
      description: 'Returns Saldos: pending debts grouped by person — who owes the user and who the user owes. Use this before mark_debt_paid or delete_debt to find the debt ID.',
      parameters: {
        type: 'object',
        properties: {
          include_paid: { type: 'boolean', description: 'Include debts already marked as paid. Default false.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_debt_paid',
      description: 'Marks a debt entry as paid/settled, removing it from the pending Saldos. Use get_debt_summary first to find the ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Debt ID to mark as paid.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_debt',
      description: 'Deletes a debt entry permanently from Saldos. Use get_debt_summary first to find the ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Debt ID to delete.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'settle_person',
      description: 'Settles ALL pending balances with one person at once: marks every one of their pending Saldos as paid. Use when the user says they settled up / squared accounts with someone (e.g. "ya me pagó todo Pedro", "quedé a mano con Ana"). To remove a single entry use mark_debt_paid instead.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Name of the person to settle up with.' },
        },
        required: ['person'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_config',
      description: 'Returns the user\'s configured categories, payment methods, and known people. Use when the user asks what categories/methods exist.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_category',
      description: 'Adds, removes, renames, or reorders expense categories. Renaming also re-points existing expenses and budgets to the new name. Reordering changes the order they appear in the app.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'remove', 'rename', 'reorder'], description: 'What to do.' },
          name: { type: 'string', description: 'The category to add, remove, or (for rename) the current name. Not needed for reorder.' },
          new_name: { type: 'string', description: 'The new name. Required only for rename.' },
          order: { type: 'array', items: { type: 'string' }, description: 'For reorder: the categories in the desired order. Any omitted ones keep their place at the end.' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_payment_method',
      description: 'Adds, removes, renames, or reorders payment methods. Renaming also re-points existing expenses to the new name. Reordering changes the order they appear in the app.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'remove', 'rename', 'reorder'], description: 'What to do.' },
          name: { type: 'string', description: 'The payment method to add, remove, or (for rename) the current name. Not needed for reorder.' },
          new_name: { type: 'string', description: 'The new name. Required only for rename.' },
          order: { type: 'array', items: { type: 'string' }, description: 'For reorder: the payment methods in the desired order. Any omitted ones keep their place at the end.' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_language',
      description: 'Switches the app language. Use when the user asks to change the language / cambiar el idioma. Spanish ("es") or English ("en").',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['es', 'en'], description: 'Target language: "es" for Spanish, "en" for English.' },
        },
        required: ['language'],
      },
    },
  },
];

function clp(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

/** Lenient number parsing — the model sometimes sends amounts as strings like "5.000". */
function toNum(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/[^\d-]/g, ''), 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

/** Matches the user referring to themselves, so they aren't turned into a debtor. */
const SELF_NAME = /^(yo|m[ií]|me)$/i;

type ParticipantInput = { name: string; amount: number };

/**
 * Normalizes the `participants` argument: coerces amounts, drops invalid rows,
 * and pulls out any self-reference ("Yo") as the user's own share.
 */
function parseParticipants(raw: unknown): { participants: ParticipantInput[]; selfPart: number | null } {
  const arr = Array.isArray(raw) ? (raw as { name?: unknown; amount?: unknown }[]) : [];
  const participants: ParticipantInput[] = [];
  let selfPart: number | null = null;
  for (const p of arr) {
    const nm = p?.name != null ? String(p.name).trim() : '';
    const amt = toNum(p?.amount);
    if (!nm || amt == null) continue;
    if (SELF_NAME.test(nm)) {
      if (selfPart == null) selfPart = Math.round(amt);
      continue;
    }
    participants.push({ name: nm, amount: Math.round(amt) });
  }
  return { participants, selfPart };
}

/** Creates one Saldo (debt owed to the user) per participant and returns the split entries. */
async function createSplitDebts(
  participants: ParticipantInput[],
  description: string | null,
  date: string,
): Promise<SplitEntry[]> {
  const entries: SplitEntry[] = [];
  for (const p of participants) {
    if (!p.name || p.amount <= 0) continue;
    const debt = await addDebt({ person: p.name, amount: p.amount, description, date, paid: false });
    entries.push({ name: p.name, amount: p.amount, debtId: debt.id });
    await useUserConfigStore.getState().addPerson(p.name);
  }
  return entries;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === 'add_transaction') {
    const amount = args.amount as number;
    const paymentMethod = (args.payment_method as string) || null;
    const date = (args.date as string) || today();
    const description = (args.description as string) || null;
    const debtPerson = (args.debt_person as string)?.trim();

    // "Deuda" payment method: record the full expense and add a Saldo for the person.
    let debtCreated: string | null = null;
    if (paymentMethod === DEBT_PAYMENT_METHOD && debtPerson) {
      await addDebt({ person: debtPerson, amount, description, date, paid: false });
      await useUserConfigStore.getState().addPerson(debtPerson);
      debtCreated = debtPerson;
    }

    const tx = await addTransaction({
      date,
      category: args.category as string,
      description,
      amount,
      payment_method: paymentMethod,
      is_fixed: (args.is_fixed as boolean) || false,
      notes: (args.notes as string) || null,
      registered: false,
    });

    return {
      success: true,
      id: tx.id,
      message: debtCreated
        ? `Gasto registrado: ${tx.description || tx.category} por ${clp(tx.amount)}. ${debtCreated} te debe ${clp(amount)}.`
        : `Gasto registrado: ${tx.description || tx.category} por ${clp(tx.amount)}`,
    };
  }

  if (name === 'add_split_expense') {
    const { participants, selfPart } = parseParticipants(args.participants);
    if (participants.length === 0) {
      return { error: 'Se necesita al menos otra persona (participants) para dividir el gasto.' };
    }

    const othersSum = participants.reduce((s, p) => s + p.amount, 0);
    let total = toNum(args.total_amount);
    if (total != null) total = Math.round(total);
    let myPart = toNum(args.my_part) ?? selfPart;
    if (myPart != null) myPart = Math.round(myPart);

    if (total == null && myPart == null) {
      return { error: 'Indica el total (total_amount) o tu parte (my_part).' };
    }
    if (total == null) total = (myPart as number) + othersSum;
    if (myPart == null) myPart = total - othersSum;

    if (myPart + othersSum !== total) {
      return {
        error: `Las partes no cuadran: tu parte (${clp(myPart)}) + otros (${clp(othersSum)}) = ${clp(myPart + othersSum)}, pero el total es ${clp(total)}.`,
      };
    }
    if (myPart < 0) {
      return { error: 'Tu parte no puede ser negativa.' };
    }

    const date = (args.date as string) || today();
    const description = (args.description as string) || null;
    const userNotes = (args.notes as string) || '';

    const entries = await createSplitDebts(participants, description, date);

    const tx = await addTransaction({
      date,
      category: args.category as string,
      description,
      amount: myPart,
      payment_method: (args.payment_method as string) || null,
      is_fixed: (args.is_fixed as boolean) || false,
      notes: encodeSplit(entries, total, userNotes),
      registered: false,
    });

    const who = entries.map((e) => `${e.name} ${clp(e.amount)}`).join(', ');
    return {
      success: true,
      id: tx.id,
      message: `Gasto dividido registrado: total ${clp(total)}, tu parte ${clp(myPart)}. En Saldos: ${who} (te deben).`,
    };
  }

  if (name === 'update_split_expense') {
    const id = args.id as string;
    if (!id) return { error: 'Falta el id del gasto.' };
    const current = await getTransactionById(id);
    if (!current) return { error: 'No se encontró un gasto con ese id. Usa get_transactions primero.' };
    const oldSplit = parseSplit(current.notes);

    // Participants: use the new list if given, otherwise keep the existing split's.
    const parsed = parseParticipants(args.participants);
    let participants = parsed.participants;
    if (args.participants == null && oldSplit) {
      participants = oldSplit.participants.map((p) => ({ name: p.name, amount: p.amount }));
    }
    if (participants.length === 0) {
      return { error: 'Indica con quién se divide el gasto (participants).' };
    }

    const othersSum = participants.reduce((s, p) => s + p.amount, 0);

    // Total/my_part default to the current state (split total, or the plain amount being split).
    let total = toNum(args.total_amount);
    if (total != null) total = Math.round(total);
    let myPart = toNum(args.my_part) ?? parsed.selfPart;
    if (myPart != null) myPart = Math.round(myPart);

    if (total == null) total = oldSplit ? oldSplit.total : current.amount;
    if (myPart == null) myPart = total - othersSum;

    if (myPart + othersSum !== total) {
      return {
        error: `Las partes no cuadran: tu parte (${clp(myPart)}) + otros (${clp(othersSum)}) = ${clp(myPart + othersSum)}, pero el total es ${clp(total)}.`,
      };
    }
    if (myPart < 0) return { error: 'Tu parte no puede ser negativa.' };

    const date = (args.date as string) || current.date;
    const description = args.description !== undefined
      ? ((args.description as string) || null)
      : current.description;
    const userNotes = args.notes !== undefined
      ? ((args.notes as string) || '')
      : (oldSplit?.notes ?? '');

    // Replace the old linked debts with freshly created ones, then re-encode the split.
    if (oldSplit) {
      for (const entry of oldSplit.participants) {
        if (entry.debtId) {
          try { await deleteDebt(entry.debtId); } catch { /* already gone */ }
        }
      }
    }
    const entries = await createSplitDebts(participants, description, date);

    const updates: Partial<TransactionInsert> = {
      amount: myPart,
      notes: encodeSplit(entries, total, userNotes),
    };
    if (args.category !== undefined) updates.category = args.category as string;
    if (args.date !== undefined) updates.date = date;
    if (args.description !== undefined) updates.description = description;
    if (args.payment_method !== undefined) updates.payment_method = (args.payment_method as string) || null;
    if (args.is_fixed !== undefined) updates.is_fixed = args.is_fixed as boolean;

    const tx = await updateTransaction(id, updates);
    const who = entries.map((e) => `${e.name} ${clp(e.amount)}`).join(', ');
    return {
      success: true,
      id: tx.id,
      message: `Gasto dividido actualizado: total ${clp(total)}, tu parte ${clp(myPart)}. En Saldos: ${who} (te deben).`,
    };
  }

  if (name === 'remove_split') {
    const id = args.id as string;
    if (!id) return { error: 'Falta el id del gasto.' };
    const current = await getTransactionById(id);
    if (!current) return { error: 'No se encontró un gasto con ese id. Usa get_transactions primero.' };
    const split = parseSplit(current.notes);
    if (!split) return { success: false, message: 'Ese gasto no está dividido.' };

    for (const entry of split.participants) {
      if (entry.debtId) {
        try { await deleteDebt(entry.debtId); } catch { /* already gone */ }
      }
    }

    const newAmount = toNum(args.amount);
    const tx = await updateTransaction(id, {
      amount: newAmount != null ? Math.round(newAmount) : split.total,
      notes: split.notes || null,
    });
    return {
      success: true,
      id: tx.id,
      message: `División quitada: el gasto queda en ${clp(tx.amount)} y se eliminaron ${split.participants.length} saldo(s) asociado(s).`,
    };
  }

  if (name === 'get_transactions') {
    const month = (args.month as string) || currentMonth();
    let txs = await getTransactions(month, args.category as string | undefined);
    if (args.only_fixed) txs = txs.filter((t) => t.is_fixed);
    const q = (args.query as string)?.trim().toLowerCase();
    if (q) {
      txs = txs.filter((t) =>
        [t.category, t.description, t.payment_method, t.notes, String(t.amount)]
          .filter(Boolean).join(' ').toLowerCase().includes(q),
      );
    }
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    const limited = args.limit ? txs.slice(0, args.limit as number) : txs.slice(0, 20);
    return { transactions: limited, total, count: txs.length };
  }

  if (name === 'get_fixed_expenses') {
    const month = (args.month as string) || currentMonth();
    const fixed = await getFixedExpenses(month);
    const total = fixed.reduce((s, t) => s + t.amount, 0);
    return {
      month,
      count: fixed.length,
      total,
      expenses: fixed.map((t) => ({
        id: t.id,
        category: t.category,
        description: t.description,
        amount: t.amount,
        payment_method: t.payment_method,
        date: t.date,
      })),
    };
  }

  if (name === 'update_transaction') {
    const { id, ...updates } = args;
    const tx = await updateTransaction(id as string, updates as Partial<TransactionInsert>);
    return { success: true, transaction: tx, message: `Gasto actualizado: ${tx.description || tx.category} por ${clp(tx.amount)}` };
  }

  if (name === 'delete_transaction') {
    await deleteTransaction(args.id as string);
    return { success: true, message: 'Gasto eliminado correctamente.' };
  }

  if (name === 'delete_all_transactions') {
    const month = (args.month as string) || undefined;
    const category = (args.category as string) || undefined;
    const allTime = (args.all_time as boolean) || false;
    if (!month && !category && !allTime) {
      return { error: 'Define el alcance: pasa month (YYYY-MM), category, o all_time=true para borrar todo el historial. No borres todo sin que el usuario lo confirme.' };
    }
    const deleted = await deleteTransactionsBulk({ month, category });
    const scope = month && category
      ? `de ${category} en ${month}`
      : month
        ? `de ${month}`
        : category
          ? `de ${category} (todo el historial)`
          : 'de todo el historial';
    return {
      success: true,
      deleted,
      message: deleted > 0
        ? `Eliminados ${deleted} gasto(s) ${scope}.`
        : `No había gastos ${scope} para eliminar.`,
    };
  }

  if (name === 'get_budget_summary') {
    const month = (args.month as string) || currentMonth();
    const { categories } = useUserConfigStore.getState();
    const summary = await getBudgetSummary(month, categories);
    const totalSpent = summary.reduce((s, i) => s + i.spent, 0);
    const totalBudget = summary.reduce((s, i) => s + i.budget, 0);
    return { month, summary, totalSpent, totalBudget };
  }

  if (name === 'set_budget') {
    const month = (args.month as string) || currentMonth();
    const category = args.category as string;
    const amount = Math.round(args.amount as number);
    await upsertBudget(month, category, amount);
    return {
      success: true,
      message: amount > 0
        ? `Presupuesto de ${category} fijado en ${clp(amount)} para ${month}.`
        : `Presupuesto de ${category} eliminado para ${month}.`,
    };
  }

  if (name === 'copy_budget') {
    const toMonth = (args.to_month as string) || currentMonth();
    const fromMonth = (args.from_month as string) || addMonths(toMonth, -1);
    const copied = await copyBudget(fromMonth, toMonth);
    return {
      success: true,
      copied,
      message: copied > 0
        ? `Copiados ${copied} presupuesto(s) de ${fromMonth} a ${toMonth}.`
        : `No había presupuestos nuevos que copiar de ${fromMonth}.`,
    };
  }

  if (name === 'carry_over_fixed') {
    const toMonth = (args.to_month as string) || currentMonth();
    const fromMonth = (args.from_month as string) || addMonths(toMonth, -1);
    const res = await carryOverFixedExpenses(fromMonth, toMonth);
    return {
      success: true,
      ...res,
      message: res.created > 0
        ? `Traídos ${res.created} gasto(s) fijo(s) de ${fromMonth} a ${toMonth}${res.skipped ? ` (${res.skipped} ya existían)` : ''}.`
        : `No había gastos fijos nuevos que traer de ${fromMonth}.`,
    };
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

  if (name === 'get_month_overview') {
    const month = (args.month as string) || currentMonth();
    return await getMonthlyOverview(month);
  }

  if (name === 'add_debt') {
    const debt = await addDebt({
      person: args.person as string,
      amount: args.amount as number,
      description: (args.description as string) || null,
      date: (args.date as string) || today(),
      paid: false,
    });
    await useUserConfigStore.getState().addPerson(args.person as string);
    const direction = debt.amount > 0 ? `${debt.person} te debe` : `Le debes a ${debt.person}`;
    return { success: true, id: debt.id, message: `${direction} ${clp(Math.abs(debt.amount))}` };
  }

  if (name === 'get_debt_summary') {
    const includePaid = (args.include_paid as boolean) || false;
    const debts = await getDebts(includePaid);
    const totalOwedToMe = debts.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0);
    const totalIOwe = debts.filter((d) => d.amount < 0).reduce((s, d) => s + Math.abs(d.amount), 0);
    return { debts, totalOwedToMe, totalIOwe, count: debts.length };
  }

  if (name === 'mark_debt_paid') {
    await markDebtPaid(args.id as string);
    return { success: true, message: 'Saldo marcado como pagado.' };
  }

  if (name === 'delete_debt') {
    await deleteDebt(args.id as string);
    return { success: true, message: 'Saldo eliminado correctamente.' };
  }

  if (name === 'settle_person') {
    const person = (args.person as string)?.trim();
    if (!person) return { error: 'Falta el nombre de la persona.' };
    const debts = await getDebts(false);
    const matches = debts.filter((d) => d.person.toLowerCase() === person.toLowerCase());
    if (matches.length === 0) {
      return { success: false, message: `No hay saldos pendientes con ${person}.` };
    }
    const net = matches.reduce((s, d) => s + d.amount, 0);
    for (const d of matches) await markDebtPaid(d.id);
    const realName = matches[0].person;
    const direction = net > 0 ? 'a tu favor' : net < 0 ? 'en tu contra' : 'ya estaban a mano';
    return {
      success: true,
      settled: matches.length,
      net,
      message: `Saldado con ${realName}: ${matches.length} saldo(s) marcados como pagados. Neto ${clp(Math.abs(net))} ${direction}.`,
    };
  }

  if (name === 'get_config') {
    const { categories, paymentMethods, persons } = useUserConfigStore.getState();
    return { categories, payment_methods: paymentMethods, persons };
  }

  if (name === 'manage_category' || name === 'manage_payment_method') {
    const isCategory = name === 'manage_category';
    const label = isCategory ? 'categoría' : 'método de pago';
    const store = useUserConfigStore.getState();
    const list = isCategory ? store.categories : store.paymentMethods;
    const add = isCategory ? store.addCategory : store.addPaymentMethod;
    const remove = isCategory ? store.removeCategory : store.removePaymentMethod;
    const rename = isCategory ? store.renameCategory : store.renamePaymentMethod;
    const reorder = isCategory ? store.reorderCategories : store.reorderPaymentMethods;

    const action = args.action as string;

    if (action === 'reorder') {
      const requested = Array.isArray(args.order) ? (args.order as unknown[]).map((o) => String(o)) : [];
      if (requested.length === 0) return { error: 'Falta la lista "order" con el nuevo orden.' };
      // Map the requested names back to the real (case-correct) items; append any the
      // model omitted so nothing is dropped from the list.
      const known = new Map(list.map((i) => [i.toLowerCase(), i]));
      const seen = new Set<string>();
      const newOrder: string[] = [];
      for (const o of requested) {
        const match = known.get(o.trim().toLowerCase());
        if (match && !seen.has(match)) { newOrder.push(match); seen.add(match); }
      }
      for (const i of list) if (!seen.has(i)) newOrder.push(i);
      await reorder(newOrder);
      return { success: true, order: newOrder, message: `Orden de ${isCategory ? 'categorías' : 'métodos de pago'} actualizado.` };
    }

    const name_ = (args.name as string)?.trim();
    if (!name_) return { error: `Falta el nombre del ${label}.` };
    const existing = list.find((i) => i.toLowerCase() === name_.toLowerCase());

    if (action === 'add') {
      if (existing) return { success: false, message: `El ${label} "${existing}" ya existe.` };
      await add(name_);
      return { success: true, message: `${isCategory ? 'Categoría' : 'Método'} "${name_}" agregado.` };
    }
    if (action === 'remove') {
      if (!existing) return { success: false, message: `No existe el ${label} "${name_}".` };
      await remove(existing);
      return { success: true, message: `${isCategory ? 'Categoría' : 'Método'} "${existing}" eliminado.` };
    }
    if (action === 'rename') {
      const newName = (args.new_name as string)?.trim();
      if (!newName) return { error: 'Falta new_name para renombrar.' };
      if (!existing) return { success: false, message: `No existe el ${label} "${name_}".` };
      if (list.some((i) => i.toLowerCase() === newName.toLowerCase())) {
        return { success: false, message: `Ya existe un ${label} "${newName}".` };
      }
      await rename(existing, newName);
      return { success: true, message: `${isCategory ? 'Categoría' : 'Método'} "${existing}" renombrado a "${newName}".` };
    }
    return { error: `Acción desconocida: ${action}` };
  }

  if (name === 'set_language') {
    const raw = String(args.language ?? '').trim().toLowerCase();
    const code: Locale | null = raw.startsWith('es') ? 'es' : raw.startsWith('en') ? 'en' : null;
    if (!code) return { error: 'Idioma no soportado. Usa "es" (Español) o "en" (English).' };
    useLocaleStore.getState().setLocale(code);
    return {
      success: true,
      language: code,
      message: code === 'es' ? 'Idioma cambiado a Español.' : 'Language changed to English.',
    };
  }

  return { error: `Unknown tool: ${name}` };
}
