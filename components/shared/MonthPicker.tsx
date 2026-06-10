import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { addMonths } from '../../services/dates';

interface Props {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
  maxMonth?: string; // YYYY-MM; forward navigation is blocked beyond this month
}

function formatDisplay(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(Number(year), Number(monthNum) - 1);
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

export function MonthPicker({ value, onChange, maxMonth }: Props) {
  const atMax = maxMonth != null && value >= maxMonth;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => onChange(addMonths(value, -1))} style={styles.btn} hitSlop={8}>
        <Text style={styles.arrow}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.label}>{formatDisplay(value)}</Text>
      <TouchableOpacity
        onPress={() => { if (!atMax) onChange(addMonths(value, 1)); }}
        style={styles.btn}
        hitSlop={8}
        disabled={atMax}
      >
        <Text style={[styles.arrow, atMax && styles.arrowDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  btn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 30,
    color: Colors.primary,
    lineHeight: 34,
    fontWeight: '300',
  },
  arrowDisabled: {
    color: Colors.textMuted,
    opacity: 0.4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
});
