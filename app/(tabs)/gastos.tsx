import React, { useEffect, useState, useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MonthPicker } from '../../components/shared/MonthPicker';
import { TransactionList } from '../../components/transactions/TransactionList';
import { TransactionForm } from '../../components/transactions/TransactionForm';
import {
  TransactionFilters, TransactionFilterState, EMPTY_FILTERS, hasActiveFilters,
} from '../../components/transactions/TransactionFilters';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useUserConfigStore } from '../../store/userConfigStore';
import { getFixedExpenses, carryOverFixedExpenses } from '../../services/recurring';
import { currentMonth, addMonths, formatMonthLong } from '../../services/dates';
import { useT } from '../../services/i18n';
import { Colors } from '../../constants/colors';
import { Transaction } from '../../types';

function applyFilters(txs: Transaction[], f: TransactionFilterState): Transaction[] {
  const q = f.text.trim().toLowerCase();
  return txs.filter((t) => {
    if (f.category && t.category !== f.category) return false;
    if (f.onlyFixed && !t.is_fixed) return false;
    if (q) {
      const hay = [t.category, t.description, t.payment_method, t.notes, String(t.amount)]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export default function ExpensesScreen() {
  const t = useT();
  const {
    transactions, loading, selectedMonth,
    setSelectedMonth, fetchTransactions,
    addTransaction, updateTransaction, deleteTransaction,
  } = useTransactionsStore();
  const categories = useUserConfigStore((s) => s.categories);

  const [formVisible, setFormVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [filters, setFilters] = useState<TransactionFilterState>(EMPTY_FILTERS);

  const params = useLocalSearchParams<{ category?: string }>();

  useEffect(() => { fetchTransactions(); }, []);

  // Drill-down: another screen can navigate here pre-filtered by category. Consume the
  // param into local state and clear it from the URL so the same jump can re-trigger.
  useEffect(() => {
    if (params.category) {
      setFilters((f) => ({ ...f, category: params.category! }));
      router.setParams({ category: '' });
    }
  }, [params.category]);

  // Offer to bring over last month's fixed expenses when the current month is empty.
  const [fixedHint, setFixedHint] = useState<{ from: string; count: number } | null>(null);
  const [carrying, setCarrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (loading || transactions.length > 0) { if (!cancelled) setFixedHint(null); return; }
      const prev = addMonths(selectedMonth, -1);
      try {
        const fixed = await getFixedExpenses(prev);
        if (!cancelled) setFixedHint(fixed.length ? { from: prev, count: fixed.length } : null);
      } catch {
        if (!cancelled) setFixedHint(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMonth, transactions.length, loading]);

  const handleCarryFixed = async () => {
    if (!fixedHint) return;
    setCarrying(true);
    try {
      const res = await carryOverFixedExpenses(fixedHint.from, selectedMonth);
      await fetchTransactions();
      if (res.created === 0) Alert.alert(t.expenses.noChangesTitle, t.expenses.noChangesMsg);
    } catch (e) {
      Alert.alert(t.common.error, String(e));
    } finally {
      setCarrying(false);
    }
  };

  const filtered = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);
  const filtersActive = hasActiveFilters(filters);

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormVisible(true);
  };

  const handleClose = () => {
    setFormVisible(false);
    setEditingTransaction(undefined);
  };

  const handleSubmit = async (data: Parameters<typeof addTransaction>[0]) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data);
    } else {
      await addTransaction(data);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MonthPicker value={selectedMonth} onChange={setSelectedMonth} maxMonth={currentMonth()} />

      {transactions.length > 0 && (
        <TransactionFilters filters={filters} onChange={setFilters} categories={categories} />
      )}

      {fixedHint && transactions.length === 0 && !loading && (
        <TouchableOpacity style={styles.carryBanner} onPress={handleCarryFixed} disabled={carrying} activeOpacity={0.85}>
          <Ionicons name="repeat-outline" size={18} color={Colors.primary} />
          <View style={styles.carryTextWrap}>
            <Text style={styles.carryTitle}>{t.expenses.carryFixedTitle}</Text>
            <Text style={styles.carrySub}>
              {t.expenses.carryFixedSub(fixedHint.count, formatMonthLong(fixedHint.from))}
            </Text>
          </View>
          <Text style={styles.carryAction}>{carrying ? '…' : t.expenses.carry}</Text>
        </TouchableOpacity>
      )}

      <TransactionList
        transactions={filtered}
        loading={loading}
        onEdit={handleEdit}
        onDelete={deleteTransaction}
        onRefresh={fetchTransactions}
        emptyTitle={filtersActive ? t.expenses.noResultsTitle : undefined}
        emptySubtitle={filtersActive ? t.expenses.noResultsSub : undefined}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setFormVisible(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <TransactionForm
        visible={formVisible}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialValues={editingTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  carryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
    borderRadius: 12,
  },
  carryTextWrap: {
    flex: 1,
    gap: 2,
  },
  carryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  carrySub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  carryAction: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: Colors.background,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '300',
  },
});
