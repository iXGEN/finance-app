import React, { useState, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Text,
} from 'react-native';
import { ChatMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { Colors } from '../../constants/colors';
import { sendMessage, ConversationMessage } from '../../services/ai/gemini';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useDebtsStore } from '../../store/debtsStore';

function uid(): string {
  return Math.random().toString(36).substring(2);
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'assistant',
      content: 'Hola! Puedo registrar tus gastos, responder preguntas sobre tu presupuesto o anotar deudas. ¿En qué te ayudo?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const refreshTransactions = useTransactionsStore((s) => s.refresh);
  const fetchBudget = useBudgetStore((s) => s.fetchSummary);
  const fetchDebts = useDebtsStore((s) => s.fetchDebts);
  const selectedMonth = useTransactionsStore((s) => s.selectedMonth);

  const history: ConversationMessage[] = messages
    .filter((m) => !m.isLoading)
    .map((m) => ({ role: m.role, content: m.content }));

  const sendMsg = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: new Date() };
    const loadingMsg: ChatMessage = { id: uid(), role: 'assistant', content: '', timestamp: new Date(), isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    setLoading(true);
    try {
      const response = await sendMessage(text, history, (partial) => {
        setMessages((prev) =>
          prev.map((m) => (m.isLoading ? { ...m, content: partial, isLoading: false } : m)),
        );
      });

      setMessages((prev) =>
        prev.map((m) => (m.isLoading ? { ...m, content: response, isLoading: false } : m)),
      );

      // Refresh stores in case the AI added data
      await Promise.all([
        refreshTransactions(),
        fetchBudget(selectedMonth),
        fetchDebts(),
      ]);
    } catch (err) {
      console.error('[ChatInterface] AI error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? { ...m, content: `Error: ${errMsg}`, isLoading: false }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, loading, history, refreshTransactions, fetchBudget, fetchDebts, selectedMonth]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un gasto o pregunta…"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={sendMsg}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
          onPress={sendMsg}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 120,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: Colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: Colors.border,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
