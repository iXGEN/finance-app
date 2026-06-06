import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Transaction } from '../../types';
import { Colors } from '../../constants/colors';
import { CATEGORY_COLORS } from '../../constants/categories';

interface Props {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`;
}

function formatDay(date: string): string {
  const [, , day] = date.split('-');
  return parseInt(day, 10).toString();
}

export function TransactionCard({ transaction, onEdit, onDelete }: Props) {
  const categoryColor = CATEGORY_COLORS[transaction.category] ?? Colors.textSecondary;

  const handlePress = () => {
    Alert.alert(transaction.category, transaction.description ?? undefined, [
      { text: 'Editar', onPress: () => onEdit(transaction) },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Eliminar gasto', '¿Eliminar este registro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(transaction.id) },
          ]),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: categoryColor }]} />
      <View style={styles.dayBadge}>
        <Text style={styles.dayText}>{formatDay(transaction.date)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1}>{transaction.category}</Text>
        {transaction.description ? (
          <Text style={styles.description} numberOfLines={1}>{transaction.description}</Text>
        ) : null}
        <View style={styles.meta}>
          {transaction.payment_method ? (
            <Text style={styles.metaText}>{transaction.payment_method}</Text>
          ) : null}
          {transaction.is_fixed ? (
            <View style={styles.fixedBadge}>
              <Text style={styles.fixedText}>FIJO</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={[styles.amount, { color: categoryColor }]}>{formatAmount(transaction.amount)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingRight: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colorBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
    marginLeft: 0,
    opacity: 0.9,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.1,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  fixedBadge: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  fixedText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
  },
});
