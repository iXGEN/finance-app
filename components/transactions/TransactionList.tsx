import React from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Transaction } from '../../types';
import { TransactionCard } from './TransactionCard';
import { Colors } from '../../constants/colors';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

function groupByWeek(transactions: Transaction[]): { week: number; items: Transaction[] }[] {
  const map = new Map<number, Transaction[]>();
  for (const tx of transactions) {
    const week = tx.week ?? 0;
    if (!map.has(week)) map.set(week, []);
    map.get(week)!.push(tx);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([week, items]) => ({ week, items }));
}

export function TransactionList({ transactions, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No expenses this month</Text>
      </View>
    );
  }

  const groups = groupByWeek(transactions);
  const total = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <FlatList
      data={groups}
      keyExtractor={(g) => String(g.week)}
      ListFooterComponent={
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Month total</Text>
          <Text style={styles.footerTotal}>${total.toLocaleString('es-CL')}</Text>
        </View>
      }
      renderItem={({ item: group }) => (
        <View>
          <View style={styles.weekHeader}>
            <Text style={styles.weekLabel}>Week {group.week}</Text>
            <Text style={styles.weekTotal}>
              ${group.items.reduce((s, t) => s + t.amount, 0).toLocaleString('es-CL')}
            </Text>
          </View>
          {group.items.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  footerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  footerTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
});
