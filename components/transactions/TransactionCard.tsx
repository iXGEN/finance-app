import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Transaction } from '../../types';
import { Colors } from '../../constants/colors';
import { CATEGORY_COLORS } from '../../constants/categories';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`;
}

function formatDay(date: string): string {
  const [, , day] = date.split('-');
  return `${parseInt(day, 10)}`;
}

export function TransactionCard({ transaction, onDelete }: Props) {
  const categoryColor = CATEGORY_COLORS[transaction.category] ?? Colors.textMuted;

  const handleDelete = () => {
    Alert.alert('Delete expense', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(transaction.id) },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onLongPress={handleDelete} activeOpacity={0.8}>
      <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
      <View style={styles.info}>
        <Text style={styles.category}>{transaction.category}</Text>
        {transaction.description ? (
          <Text style={styles.description} numberOfLines={1}>{transaction.description}</Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.metaText}>Day {formatDay(transaction.date)}</Text>
          {transaction.payment_method ? (
            <Text style={styles.metaText}> · {transaction.payment_method}</Text>
          ) : null}
          {transaction.is_fixed ? (
            <Text style={styles.fixed}> · Fixed</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.amount}>{formatAmount(transaction.amount)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  fixed: {
    fontSize: 12,
    color: Colors.primary,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
});
