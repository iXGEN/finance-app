import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonthPicker } from '../../components/shared/MonthPicker';
import { BudgetCard } from '../../components/budget/BudgetCard';
import { useBudgetStore } from '../../store/budgetStore';
import { Colors } from '../../constants/colors';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function BudgetScreen() {
  const { summary, loading, fetchSummary, upsertBudget } = useBudgetStore();
  const [month, setMonth] = useState(() => new Date().toISOString().substring(0, 7));

  useEffect(() => { fetchSummary(month); }, [month]);

  const totalSpent = summary.reduce((s, i) => s + i.spent, 0);
  const totalBudget = summary.reduce((s, i) => s + i.budget, 0);
  const available = totalBudget - totalSpent;
  const over = totalBudget > 0 && totalSpent > totalBudget;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MonthPicker value={month} onChange={setMonth} />

      {totalBudget > 0 && (
        <View style={styles.totals}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Gastado</Text>
            <Text style={[styles.totalValue, over && { color: Colors.danger }]}>
              ${totalSpent.toLocaleString('es-CL')}
            </Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Presupuesto</Text>
            <Text style={styles.totalValue}>${totalBudget.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Disponible</Text>
            <Text style={[styles.totalValue, { color: available >= 0 ? Colors.primary : Colors.danger }]}>
              ${Math.abs(available).toLocaleString('es-CL')}
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={summary}
          keyExtractor={(i) => i.category}
          renderItem={({ item }) => (
            <BudgetCard item={item} month={month} onUpdate={upsertBudget} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.emptyTitle}>Sin datos este mes</Text>
              <Text style={styles.emptySubtitle}>Toca una categoría para asignar un presupuesto</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  totals: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 14,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  totalDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
});
