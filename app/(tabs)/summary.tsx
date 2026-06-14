import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MonthPicker } from '../../components/shared/MonthPicker';
import { MiniBarChart } from '../../components/insights/MiniBarChart';
import { CategoryBars } from '../../components/insights/CategoryBars';
import { StatCard } from '../../components/insights/StatCard';
import { getMonthlyOverview, MonthlyOverview } from '../../services/insights';
import { currentMonth } from '../../services/dates';
import { useT } from '../../services/i18n';
import { Colors } from '../../constants/colors';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function clp(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export default function ResumenScreen() {
  const t = useT();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthlyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const overview = await getMonthlyOverview(month);
      setData(overview);
    } catch {
      // keep whatever we last had
    } finally {
      setLoading(false);
    }
  }, [month]);

  // Reload whenever the tab gains focus or the month changes, so edits made in other
  // tabs (new expense, budget change, settled debt) are reflected without a flicker.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goToCategory = (category: string) =>
    router.navigate(`/expenses?category=${encodeURIComponent(category)}`);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MonthPicker value={month} onChange={setMonth} maxMonth={currentMonth()} />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        >
          <Hero data={data} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.summary.last6Months}</Text>
            <MiniBarChart data={data.trend} highlightMonth={data.month} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.summary.topCategories}</Text>
            {data.topCategories.length > 0 ? (
              <CategoryBars
                items={data.topCategories}
                total={data.totalSpent}
                onPressCategory={goToCategory}
              />
            ) : (
              <Text style={styles.emptyHint}>{t.summary.noExpensesThisMonth}</Text>
            )}
          </View>

          <View style={styles.snapshotRow}>
            <StatCard
              label={t.summary.owedToYou}
              value={clp(data.debtOwedToMe)}
              accent={Colors.success}
              onPress={() => router.navigate('/balances')}
            />
            <StatCard
              label={t.summary.youOwe}
              value={clp(data.debtIOwe)}
              accent={Colors.danger}
              onPress={() => router.navigate('/balances')}
            />
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function Hero({ data }: { data: MonthlyOverview }) {
  const t = useT();
  const { totalSpent, totalBudget, prevSpent } = data;
  const over = totalBudget > 0 && totalSpent > totalBudget;
  const pct = totalBudget > 0 ? Math.min(totalSpent / totalBudget, 1) : 0;
  const remaining = totalBudget - totalSpent;

  const diff = totalSpent - prevSpent;
  const pctChange = prevSpent > 0 ? Math.round((diff / prevSpent) * 100) : null;
  const up = diff > 0;
  const chipColor = up ? Colors.danger : Colors.success;

  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>{t.summary.monthSpend}</Text>
      <Text style={styles.heroValue}>{clp(totalSpent)}</Text>

      {pctChange !== null && (
        <View style={styles.heroChipRow}>
          <View style={[styles.heroChip, { backgroundColor: chipColor + '1A' }]}>
            <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={12} color={chipColor} />
            <Text style={[styles.heroChipText, { color: chipColor }]}>{Math.abs(pctChange)}%</Text>
          </View>
          <Text style={styles.heroChipCaption}>{t.summary.vsPrevMonth(clp(prevSpent))}</Text>
        </View>
      )}

      {totalBudget > 0 ? (
        <View style={styles.heroBudget}>
          <View style={styles.heroBarBg}>
            <View
              style={[styles.heroBarFill, { width: `${pct * 100}%`, backgroundColor: over ? Colors.danger : Colors.primary }]}
            />
          </View>
          <View style={styles.heroBudgetRow}>
            <Text style={styles.heroBudgetText}>{t.summary.ofBudgeted(clp(totalBudget))}</Text>
            <Text style={[styles.heroBudgetText, { color: over ? Colors.danger : Colors.primary, fontWeight: '700' }]}>
              {over ? t.summary.exceeded(clp(-remaining)) : t.summary.available(clp(remaining))}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.heroNoBudget}>{t.summary.noBudget}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 12,
    gap: 12,
  },

  // Hero
  hero: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 18,
  },
  heroLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  heroChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroChipCaption: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  heroBudget: {
    marginTop: 16,
    gap: 7,
  },
  heroBarBg: {
    height: 7,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: 7,
    borderRadius: 4,
  },
  heroBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBudgetText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  heroNoBudget: {
    marginTop: 14,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Saldos snapshot
  snapshotRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
