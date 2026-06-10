import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { formatMonthShort } from '../../services/dates';
import { MonthPoint } from '../../services/insights';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const TRACK_HEIGHT = 96;

/** Compact CLP for tight spaces: 1.2M, 450k, 800. */
export function compactCLP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

interface Props {
  data: MonthPoint[];
  highlightMonth?: string;
}

export function MiniBarChart({ data, highlightMonth }: Props) {
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <View style={styles.row}>
      {data.map((d) => {
        const active = d.month === highlightMonth;
        const height = d.total > 0 ? Math.max(3, Math.round((d.total / max) * TRACK_HEIGHT)) : 2;
        return (
          <View key={d.month} style={styles.col}>
            <Text style={[styles.value, active && styles.valueActive]} numberOfLines={1}>
              {d.total > 0 ? compactCLP(d.total) : ''}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { height, backgroundColor: active ? Colors.primary : Colors.surfaceActive },
                ]}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{formatMonthShort(d.month)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '58%',
    minWidth: 14,
    borderRadius: 5,
  },
  value: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
    height: 13,
  },
  valueActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: Colors.text,
    fontWeight: '700',
  },
});
