import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { addMonths, formatMonthLong } from '../../services/dates';
import { useLocaleStore } from '../../store/localeStore';

interface Props {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
  maxMonth?: string; // YYYY-MM; forward navigation is blocked beyond this month
}

export function MonthPicker({ value, onChange, maxMonth }: Props) {
  const locale = useLocaleStore((s) => s.locale); // re-render the label on language change
  const atMax = maxMonth != null && value >= maxMonth;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => onChange(addMonths(value, -1))} style={styles.btn} hitSlop={8}>
        <Text style={styles.arrow}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.label}>{formatMonthLong(value, locale)}</Text>
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
