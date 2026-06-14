import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Platform, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MonthPicker } from '../../components/shared/MonthPicker';
import { BudgetCard } from '../../components/budget/BudgetCard';
import { useBudgetStore } from '../../store/budgetStore';
import { getBudgetConfigs, copyBudget } from '../../services/budget';
import { addMonths, formatMonthLong } from '../../services/dates';
import { useT } from '../../services/i18n';
import { Colors } from '../../constants/colors';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function BudgetScreen() {
  const t = useT();
  const { summary, loading, fetchSummary, upsertBudget } = useBudgetStore();
  const [month, setMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [copyHint, setCopyHint] = useState<{ from: string; count: number } | null>(null);
  const [copying, setCopying] = useState(false);

  // Refetch on focus and on month change, so chat/UI edits reflect without a restart.
  useFocusEffect(useCallback(() => { fetchSummary(month); }, [month, fetchSummary]));

  const totalSpent = summary.reduce((s, i) => s + i.spent, 0);
  const totalBudget = summary.reduce((s, i) => s + i.budget, 0);
  const available = totalBudget - totalSpent;
  const over = totalBudget > 0 && totalSpent > totalBudget;

  // Offer to copy last month's budget when this month has none configured yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (totalBudget > 0) { if (!cancelled) setCopyHint(null); return; }
      const prev = addMonths(month, -1);
      try {
        const prevConfigs = await getBudgetConfigs(prev);
        const withBudget = prevConfigs.filter((c) => c.budget > 0);
        if (!cancelled) setCopyHint(withBudget.length ? { from: prev, count: withBudget.length } : null);
      } catch {
        if (!cancelled) setCopyHint(null);
      }
    })();
    return () => { cancelled = true; };
  }, [month, totalBudget]);

  const handleCopyBudget = async () => {
    if (!copyHint) return;
    setCopying(true);
    try {
      await copyBudget(copyHint.from, month);
      await fetchSummary(month);
    } catch (e) {
      Alert.alert(t.common.error, String(e));
    } finally {
      setCopying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MonthPicker value={month} onChange={setMonth} />

      {totalBudget > 0 && (
        <View style={styles.totals}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>{t.budget.spent}</Text>
            <Text style={[styles.totalValue, over && { color: Colors.danger }]}>
              ${totalSpent.toLocaleString('es-CL')}
            </Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>{t.budget.budget}</Text>
            <Text style={styles.totalValue}>${totalBudget.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>{t.budget.available}</Text>
            <Text style={[styles.totalValue, { color: available >= 0 ? Colors.primary : Colors.danger }]}>
              ${Math.abs(available).toLocaleString('es-CL')}
            </Text>
          </View>
        </View>
      )}

      {copyHint && totalBudget === 0 && (
        <TouchableOpacity style={styles.copyBanner} onPress={handleCopyBudget} disabled={copying} activeOpacity={0.85}>
          <Ionicons name="copy-outline" size={18} color={Colors.primary} />
          <View style={styles.copyTextWrap}>
            <Text style={styles.copyTitle}>{t.budget.copyTitle}</Text>
            <Text style={styles.copySub}>
              {t.budget.copySub(copyHint.count, formatMonthLong(copyHint.from))}
            </Text>
          </View>
          <Text style={styles.copyAction}>{copying ? '…' : t.budget.copy}</Text>
        </TouchableOpacity>
      )}

      {loading && summary.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={summary}
          keyExtractor={(i) => i.category}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => fetchSummary(month)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <BudgetCard
              item={item}
              month={month}
              onUpdate={upsertBudget}
              onPressCategory={(cat) => router.navigate(`/expenses?category=${encodeURIComponent(cat)}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.emptyTitle}>{t.budget.noDataTitle}</Text>
              <Text style={styles.emptySubtitle}>{t.budget.noDataSub}</Text>
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
  copyBanner: {
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
  copyTextWrap: {
    flex: 1,
    gap: 2,
  },
  copyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  copySub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  copyAction: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
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
