import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonthPicker } from '../../components/shared/MonthPicker';
import { BudgetCard } from '../../components/budget/BudgetCard';
import { useBudgetStore } from '../../store/budgetStore';
import { Colors } from '../../constants/colors';

export default function BudgetScreen() {
  const { summary, loading, fetchSummary, upsertBudget } = useBudgetStore();
  const [month, setMonth] = useState(() => new Date().toISOString().substring(0, 7));

  useEffect(() => { fetchSummary(month); }, [month]);

  const totalSpent = summary.reduce((s, i) => s + i.spent, 0);
  const totalBudget = summary.reduce((s, i) => s + i.budget, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MonthPicker value={month} onChange={setMonth} />

      {totalBudget > 0 && (
        <View style={styles.totals}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Spent</Text>
            <Text style={[styles.totalValue, totalSpent > totalBudget && { color: Colors.danger }]}>
              ${totalSpent.toLocaleString('es-CL')}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Budget</Text>
            <Text style={styles.totalValue}>${totalBudget.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Available</Text>
            <Text style={[styles.totalValue, { color: totalBudget - totalSpent >= 0 ? Colors.success : Colors.danger }]}>
              ${(totalBudget - totalSpent).toLocaleString('es-CL')}
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
              <Text style={styles.empty}>
                No data this month.{'\n'}Add expenses or tap a category to set a budget.
              </Text>
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
    paddingVertical: 12,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  empty: {
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
