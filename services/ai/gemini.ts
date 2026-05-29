import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { toolDefinitions, executeTool } from './tools';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GOOGLE_API_KEY!);

const SYSTEM_PROMPT = `You are a personal finance assistant. You have access to the user's expense records in Chilean pesos (CLP).

You can:
- Record expenses when the user mentions them (use add_transaction)
- Answer questions about their spending (use get_transactions and get_budget_summary)
- Record debts (use add_debt)

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

function toGeminiHistory(history: ConversationMessage[]): Content[] {
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

export async function sendMessage(
  userMessage: string,
  history: ConversationMessage[],
  onUpdate?: (text: string) => void,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: toolDefinitions }],
  });

  const chat = model.startChat({ history: toGeminiHistory(history) });

  let result = await chat.sendMessage(userMessage);
  let response = result.response;

  // Agentic loop: keep going while model wants to use tools
  while (true) {
    const functionCalls = response.functionCalls();
    if (!functionCalls || functionCalls.length === 0) break;

    const toolResults = await Promise.all(
      functionCalls.map(async (fc) => {
        const output = await executeTool(fc.name, fc.args as Record<string, unknown>);
        return {
          functionResponse: {
            name: fc.name,
            response: output as object,
          },
        };
      }),
    );

    result = await chat.sendMessage(toolResults);
    response = result.response;
  }

  const text = response.text();
  onUpdate?.(text);
  return text;
}
