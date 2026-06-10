import Groq from 'groq-sdk';
import { fetch } from 'expo/fetch';
import { toolDefinitions, executeTool } from './tools';

const MODEL = 'llama-3.3-70b-versatile';

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/** The user's current setup, injected into the prompt so the model uses real values. */
export interface ChatContext {
  categories: string[];
  paymentMethods: string[];
  persons: string[];
}

function buildSystemPrompt(ctx: ChatContext): string {
  const now = new Date();
  const cats = ctx.categories.length ? ctx.categories.join(', ') : '(ninguna aún)';
  const pms = ctx.paymentMethods.length ? ctx.paymentMethods.join(', ') : '(ninguno aún)';
  const persons = ctx.persons.length ? ctx.persons.join(', ') : '(ninguna aún)';

  return `You are a personal finance assistant for a mobile app in Chilean pesos (CLP). You can fully operate the app on the user's behalf through the available tools — anything the user could do by hand in the app, you can do.

Capabilities:
- Expenses: add (add_transaction), add a shared/split expense (add_split_expense), list & review (get_transactions), edit (update_transaction), delete (delete_transaction). Toggle whether an expense is recurring with is_fixed.
- Split expenses: when an expense is shared with other people, use add_split_expense. The user's own share is recorded as the expense; each other person's share is added to Saldos as money they owe the user. To edit a split (change amounts/people/total) or to split an existing normal expense, use update_split_expense — it re-syncs the linked Saldos. To undo a split, use remove_split. Do NOT use update_transaction on a split expense.
- "Deuda" payment method: if the user paid the whole thing for someone who will pay them back, call add_transaction with payment_method "Deuda" and debt_person set; the full amount is added to Saldos as owed to the user.
- Budget: view (get_budget_summary) and set/edit per category (set_budget).
- Recurrence: copy a month's budgets into another (copy_budget) and regenerate recurring fixed expenses into a new month (carry_over_fixed); default the source to the previous month.
- Saldos (debts): view (get_debt_summary), add (add_debt), mark as paid (mark_debt_paid), delete (delete_debt). Positive amount = they owe the user; negative = the user owes them.
- Analytics: compare two months (compare_months), spending trend (get_spending_trend).
- Settings: view config (get_config), manage categories (manage_category) and payment methods (manage_payment_method).

User's current setup:
- Categories: ${cats}
- Payment methods: ${pms}
- Known people: ${persons}

Rules:
- Prefer the user's existing categories and payment methods listed above; match the user's wording to the closest one. Only create a new category/method when the user clearly intends a new one.
- When the user mentions an expense, record it (add_transaction or add_split_expense) before confirming. Use add_split_expense whenever more than one person shares the cost.
- Interpret CLP amounts: "$25.000" = 25000, "1.200.000" = 1200000, "25 lucas"/"25k" = 25000.
- To edit, delete, mark paid, or settle anything, you MUST first call get_transactions or get_debt_summary to find the real id, then act with that id. Never call update_transaction, delete_transaction, mark_debt_paid, or delete_debt with an invented id.
- Before deleting anything, briefly confirm which item with the user unless they were already explicit.
- If no date is given, use today (${now.toISOString().substring(0, 10)}). Current month: ${now.toISOString().substring(0, 7)}.
- Respond in Spanish. Be concise and confirm what you did with concrete amounts and names.`;
}

function isRetryableError(msg: string): boolean {
  return (
    msg.includes('tool_use_failed') ||
    msg.includes('validation failed') ||
    msg.includes('Failed to call') ||
    msg.includes('failed to call')
  );
}

function parseGroqError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('quota')) {
    throw new Error('Límite de uso alcanzado. Intenta en unos segundos.');
  }
  throw err instanceof Error ? err : new Error(msg);
}

export async function sendMessage(
  userMessage: string,
  history: ConversationMessage[],
  context: ChatContext,
  onUpdate?: (text: string) => void,
): Promise<string> {
  if (!process.env.EXPO_PUBLIC_GROQ_API_KEY) {
    throw new Error('EXPO_PUBLIC_GROQ_API_KEY no está definida. Agrégala al .env y reinicia Expo.');
  }

  const groq = new Groq({
    apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
    fetch: fetch as unknown as typeof globalThis.fetch,
  });

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  try {
    let retries = 0;
    while (true) {
      let content = '';
      const pendingTools: Record<number, { id: string; name: string; arguments: string }> = {};

      try {
        const stream = await groq.chat.completions.create({
          model: MODEL,
          messages,
          tools: toolDefinitions,
          tool_choice: 'auto',
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            content += delta.content;
            onUpdate?.(content);
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!pendingTools[idx]) {
                pendingTools[idx] = { id: '', name: '', arguments: '' };
              }
              if (tc.id) pendingTools[idx].id = tc.id;
              if (tc.function?.name) pendingTools[idx].name += tc.function.name;
              if (tc.function?.arguments) pendingTools[idx].arguments += tc.function.arguments;
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isRetryableError(msg) && retries < 3) {
          retries++;
          continue;
        }
        throw err;
      }

      const toolCalls = Object.values(pendingTools);
      retries = 0;

      if (toolCalls.length === 0) {
        return content;
      }

      messages.push({
        role: 'assistant',
        content: content || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      } as Groq.Chat.ChatCompletionMessageParam);

      onUpdate?.('...');

      // Run tools sequentially: several may mutate the same shared state
      // (config, budget) in one turn, and parallel writes could clobber each other.
      for (const tc of toolCalls) {
        let result: unknown;
        try {
          const args = (JSON.parse(tc.arguments || '{}') ?? {}) as Record<string, unknown>;
          result = await executeTool(tc.name, args);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) };
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }
  } catch (err) {
    parseGroqError(err);
  }
}
