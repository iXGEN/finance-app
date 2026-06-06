import Groq from 'groq-sdk';
import { fetch } from 'expo/fetch';
import { toolDefinitions, executeTool } from './tools';

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a personal finance assistant. You have access to the user's expense records in Chilean pesos (CLP).

You can:
- Record expenses when the user mentions them (use add_transaction)
- Answer questions about their spending (use get_transactions and get_budget_summary)
- Compare months (use compare_months)
- Show spending trends (use get_spending_trend)
- Edit or delete transactions (use get_transactions to find the ID first, then update_transaction or delete_transaction)
- Record and consult debts (use add_debt and get_debt_summary)

Rules:
- When the user mentions an expense, ALWAYS call add_transaction before confirming.
- For CLP amounts, interpret "$25.000" as 25000, "$1.200.000" as 1200000.
- If no date is specified, use today.
- Respond in Spanish.
- Be concise. Briefly confirm what you did.
- Current month: ${new Date().toISOString().substring(0, 7)}.`;

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  try {
    let retries = 0;
    while (true) {
      let stream;
      try {
        stream = await groq.chat.completions.create({
          model: MODEL,
          messages,
          tools: toolDefinitions,
          tool_choice: 'auto',
          stream: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if ((msg.includes('tool_use_failed') || msg.includes('validation failed')) && retries < 3) {
          retries++;
          continue;
        }
        throw err;
      }

      let content = '';
      const pendingTools: Record<number, { id: string; name: string; arguments: string }> = {};

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

      await Promise.all(
        toolCalls.map(async (tc) => {
          const args = (JSON.parse(tc.arguments || '{}') ?? {}) as Record<string, unknown>;
          const result = await executeTool(tc.name, args);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }),
      );
    }
  } catch (err) {
    parseGroqError(err);
  }
}
