import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  value: string; // YYYY-MM
  onChange: (mes: string) => void;
}

function formatDisplay(mes: string): string {
  const [year, month] = mes.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function addMonths(mes: string, delta: number): string {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(year, month - 1 + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthPicker({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => onChange(addMonths(value, -1))} style={styles.btn}>
        <Text style={styles.arrow}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.label}>{formatDisplay(value)}</Text>
      <TouchableOpacity onPress={() => onChange(addMonths(value, 1))} style={styles.btn}>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  arrow: {
    fontSize: 28,
    color: Colors.primary,
    lineHeight: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    width: 180,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
