import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Debt } from '../../types';
import { Colors } from '../../constants/colors';

interface Props {
  debt: Debt;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DebtCard({ debt, onMarkPaid, onDelete }: Props) {
  const positive = debt.amount > 0;

  const handleLongPress = () => {
    Alert.alert('Options', debt.description ?? debt.person, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark as paid', onPress: () => onMarkPaid(debt.id) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(debt.id) },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onLongPress={handleLongPress} activeOpacity={0.8}>
      <View style={[styles.indicator, { backgroundColor: positive ? Colors.success : Colors.danger }]} />
      <View style={styles.info}>
        <Text style={styles.person}>{debt.person}</Text>
        {debt.description ? (
          <Text style={styles.desc} numberOfLines={1}>{debt.description}</Text>
        ) : null}
        <Text style={styles.date}>{debt.date}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: positive ? Colors.success : Colors.danger }]}>
          {positive ? '+' : '−'}${Math.abs(debt.amount).toLocaleString('es-CL')}
        </Text>
        <Text style={styles.direction}>{positive ? 'they owe you' : 'you owe'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  person: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  direction: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
