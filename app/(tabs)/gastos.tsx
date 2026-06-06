import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonthPicker } from '../../components/shared/MonthPicker';
import { TransactionList } from '../../components/transactions/TransactionList';
import { TransactionForm } from '../../components/transactions/TransactionForm';
import { useTransactionsStore } from '../../store/transactionsStore';
import { Colors } from '../../constants/colors';
import { Transaction } from '../../types';

export default function ExpensesScreen() {
  const {
    transactions, loading, selectedMonth,
    setSelectedMonth, fetchTransactions,
    addTransaction, updateTransaction, deleteTransaction,
  } = useTransactionsStore();

  const [formVisible, setFormVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  useEffect(() => { fetchTransactions(); }, []);

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
      <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      <TransactionList
        transactions={transactions}
        loading={loading}
        onEdit={handleEdit}
        onDelete={deleteTransaction}
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
