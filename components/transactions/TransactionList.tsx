import React from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Transaction } from '../../types';
import { TransactionCard } from './TransactionCard';
import { useT } from '../../services/i18n';
import { Colors } from '../../constants/colors';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptySubtitle?: string;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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

export function TransactionList({ transactions, loading, onEdit, onDelete, onRefresh, emptyTitle, emptySubtitle }: Props) {
  const t = useT();
  // Full-screen spinner only on the first load (no data yet); later refreshes keep
  // the list visible and surface progress through the pull-to-refresh control.
  if (loading && transactions.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>◎</Text>
        <Text style={styles.emptyTitle}>{emptyTitle ?? t.tx.noExpenses}</Text>
        <Text style={styles.emptySubtitle}>{emptySubtitle ?? t.tx.addHint}</Text>
      </View>
    );
  }

  const groups = groupByWeek(transactions);
  const total = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <FlatList
      data={groups}
      keyExtractor={(g) => String(g.week)}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        ) : undefined
      }
      ListFooterComponent={
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>{t.tx.monthTotal}</Text>
          <Text style={styles.footerTotal}>${total.toLocaleString('es-CL')}</Text>
        </View>
      }
      renderItem={({ item: group }) => (
        <View>
          <View style={styles.weekHeader}>
            <Text style={styles.weekLabel}>{t.tx.week(group.week)}</Text>
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
    gap: 6,
  },
  emptyIcon: {
    fontSize: 36,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: Colors.background,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  weekTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footerTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
  },
});
