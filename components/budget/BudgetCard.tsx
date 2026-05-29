import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { BudgetSummaryItem } from '../../types';
import { Colors } from '../../constants/colors';
import { CATEGORY_COLORS } from '../../constants/categories';

interface Props {
  item: BudgetSummaryItem;
  month: string;
  onUpdate: (month: string, category: string, budget: number) => Promise<void>;
}

export function BudgetCard({ item, month, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.budget));
  const color = CATEGORY_COLORS[item.category] ?? Colors.primary;
  const pct = item.budget > 0 ? Math.min(item.spent / item.budget, 1) : 0;
  const over = item.budget > 0 && item.spent > item.budget;

  const handleSave = async () => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    if (isNaN(num)) {
      Alert.alert('Error', 'Enter a valid number');
      return;
    }
    await onUpdate(month, item.category, num);
    setEditing(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.name} numberOfLines={1}>{item.category}</Text>
        <View style={styles.amounts}>
          <Text style={[styles.spent, over && styles.over]}>
            ${item.spent.toLocaleString('es-CL')}
          </Text>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                keyboardType="numeric"
                autoFocus
              />
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.ok}>OK</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setValue(String(item.budget)); setEditing(true); }}>
              <Text style={styles.budget}>
                / ${item.budget > 0 ? item.budget.toLocaleString('es-CL') : '—'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {item.budget > 0 && (
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: over ? Colors.danger : color }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  spent: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  over: {
    color: Colors.danger,
  },
  budget: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 4,
    padding: 2,
    paddingHorizontal: 6,
    fontSize: 12,
    width: 80,
    color: Colors.text,
  },
  ok: {
    marginLeft: 6,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  barBg: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
});
