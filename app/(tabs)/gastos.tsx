import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonthPicker } from '../../components/shared/MonthPicker';
import { TransactionList } from '../../components/transactions/TransactionList';
import { TransactionForm } from '../../components/transactions/TransactionForm';
import { useTransactionsStore } from '../../store/transactionsStore';
import { Colors } from '../../constants/colors';

export default function ExpensesScreen() {
  const {
    transactions, loading, selectedMonth,
    setSelectedMonth, fetchTransactions, addTransaction, deleteTransaction,
  } = useTransactionsStore();
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => { fetchTransactions(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      <TransactionList
        transactions={transactions}
        loading={loading}
        onDelete={deleteTransaction}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setFormVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <TransactionForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={(tx) => addTransaction(tx).then(() => {})}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
  },
});
