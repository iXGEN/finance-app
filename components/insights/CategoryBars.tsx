import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { CATEGORY_COLORS } from '../../constants/categories';
import { CategorySpend } from '../../services/insights';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface Props {
  items: CategorySpend[];
  total: number;
  limit?: number;
  onPressCategory?: (category: string) => void;
}

export function CategoryBars({ items, total, limit = 6, onPressCategory }: Props) {
  const shown = items.slice(0, limit);
  const max = shown.length ? shown[0].amount : 1;

  return (
    <View style={styles.container}>
      {shown.map((item) => {
        const color = CATEGORY_COLORS[item.category] ?? Colors.primary;
        const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
        const width = `${Math.max(4, Math.round((item.amount / max) * 100))}%` as const;
        return (
          <TouchableOpacity
            key={item.category}
            style={styles.row}
            onPress={() => onPressCategory?.(item.category)}
            disabled={!onPressCategory}
            activeOpacity={0.6}
          >
            <View style={styles.head}>
              <View style={styles.nameWrap}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.name} numberOfLines={1}>{item.category}</Text>
              </View>
              <Text style={styles.amount}>${item.amount.toLocaleString('es-CL')}</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width, backgroundColor: color }]} />
            </View>
            <Text style={styles.pct}>{pct}%</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    gap: 6,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  name: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
  },
  barBg: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  pct: {
    fontSize: 10,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
    alignSelf: 'flex-end',
  },
});
