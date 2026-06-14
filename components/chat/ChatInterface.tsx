import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Text,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ChatMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { Colors } from '../../constants/colors';
import { sendMessage, ConversationMessage } from '../../services/ai/gemini';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useDebtsStore } from '../../store/debtsStore';
import { useUserConfigStore } from '../../store/userConfigStore';
import { useT } from '../../services/i18n';
import { useLocaleStore } from '../../store/localeStore';

function uid(): string {
  return Math.random().toString(36).substring(2);
}

export function ChatInterface() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: uid(),
      role: 'assistant',
      content: t.chat.welcome,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const lastUserMessageRef = useRef('');
  const refreshTransactions = useTransactionsStore((s) => s.refresh);
  const fetchBudget = useBudgetStore((s) => s.fetchSummary);
  const fetchDebts = useDebtsStore((s) => s.fetchDebts);
  const fetchConfig = useUserConfigStore((s) => s.fetch);
  const selectedMonth = useTransactionsStore((s) => s.selectedMonth);
  const categories = useUserConfigStore((s) => s.categories);
  const paymentMethods = useUserConfigStore((s) => s.paymentMethods);
  const persons = useUserConfigStore((s) => s.persons);

  // Keep the greeting in the active language until the user actually starts chatting.
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].role === 'assistant'
        ? [{ ...prev[0], content: t.chat.welcome }]
        : prev,
    );
  }, [locale]);

  const history: ConversationMessage[] = messages
    .filter((m) => !m.isLoading && !m.isError)
    .map((m) => ({ role: m.role, content: m.content }));

  const runSend = useCallback(async (text: string) => {
    const loadingId = uid();
    const loadingMsg: ChatMessage = { id: loadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true };

    setMessages((prev) => [...prev, loadingMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    setLoading(true);
    try {
      const response = await sendMessage(text, history, { categories, paymentMethods, persons, locale }, (partial) => {
        setMessages((prev) =>
          prev.map((m) => m.id === loadingId ? { ...m, content: partial, isLoading: false } : m),
        );
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
      });

      setMessages((prev) =>
        prev.map((m) => m.id === loadingId ? { ...m, content: response, isLoading: false } : m),
      );

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t.chat.unexpectedError;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: errMsg, isLoading: false, isError: true }
            : m,
        ),
      );
    } finally {
      // Always sync the stores with the DB — even if the model threw *after* already
      // performing tool writes — so screens never stay stale until an app restart.
      await Promise.all([
        refreshTransactions(),
        fetchBudget(selectedMonth),
        fetchDebts(),
        fetchConfig(),
      ]).catch(() => {});
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [history, refreshTransactions, fetchBudget, fetchDebts, fetchConfig, selectedMonth, categories, paymentMethods, persons, locale, t]);

  const sendMsg = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    lastUserMessageRef.current = text;

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    await runSend(text);
  }, [input, loading, runSend]);

  const retry = useCallback(() => {
    const text = lastUserMessageRef.current;
    if (!text || loading) return;
    setMessages((prev) => prev.filter((m) => !m.isError));
    runSend(text);
  }, [loading, runSend]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} onRetry={item.isError ? retry : undefined} />
        )}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t.chat.placeholder}
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
