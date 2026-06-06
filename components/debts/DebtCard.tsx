import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Debt } from '../../types';
import { Colors } from '../../constants/colors';

interface Props {
  debt: Debt;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export function DebtCard({ debt, onMarkPaid, onDelete }: Props) {
  const positive = debt.amount > 0;
  const accentColor = positive ? Colors.success : Colors.danger;
  const accentDim = positive ? Colors.successDim : Colors.dangerDim;

  const handleLongPress = () => {
    Alert.alert('Opciones', debt.description ?? debt.person, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Marcar como pagado', onPress: () => onMarkPaid(debt.id) },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(debt.id) },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onLongPress={handleLongPress} activeOpacity={0.75}>
      <View style={[styles.indicator, { backgroundColor: accentColor }]} />
      <View style={styles.info}>
        <Text style={styles.person}>{debt.person}</Text>
        {debt.description ? (
          <Text style={styles.desc} numberOfLines={1}>{debt.description}</Text>
        ) : null}
        <Text style={styles.date}>{debt.date}</Text>
      </View>
      <View style={[styles.amountBadge, { backgroundColor: accentDim }]}>
        <Text style={[styles.direction, { color: accentColor }]}>
          {positive ? 'te deben' : 'debes'}
        </Text>
        <Text style={[styles.amount, { color: accentColor, fontFamily: MONO }]}>
          {positive ? '+' : '−'}${Math.abs(debt.amount).toLocaleString('es-CL')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingRight: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  indicator: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 14,
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
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  amountBadge: {
    alignItems: 'flex-end',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  direction: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
