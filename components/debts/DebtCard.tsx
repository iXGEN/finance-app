import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Debt } from '../../types';
import { Colors } from '../../constants/colors';

interface Props {
  debt: Debt;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export function DebtCard({ debt, onMarkPaid, onDelete }: Props) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const positive = debt.amount > 0;
  const accentColor = positive ? Colors.success : Colors.danger;
  const accentDim = positive ? Colors.successDim : Colors.dangerDim;

  return (
    <>
      <View style={styles.card}>
        <View style={[styles.indicator, { backgroundColor: accentColor }]} />

        <View style={styles.info}>
          <Text style={styles.person}>{debt.person}</Text>
          <Text style={[styles.desc, !debt.description && styles.descEmpty]} numberOfLines={2}>
            {debt.description || 'Sin descripción'}
          </Text>
          <Text style={styles.date}>{debt.date}</Text>
        </View>

        <View style={styles.right}>
          <View style={[styles.amountBadge, { backgroundColor: accentDim }]}>
            <Text style={[styles.direction, { color: accentColor }]}>
              {positive ? 'a tu favor' : 'debes'}
            </Text>
            <Text style={[styles.amount, { color: accentColor, fontFamily: MONO }]}>
              {positive ? '+' : '−'}${Math.abs(debt.amount).toLocaleString('es-CL')}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onMarkPaid(debt.id)} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success + 'AA'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirmVisible(true)} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={15} color={Colors.danger + '99'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons name="trash-outline" size={26} color={Colors.danger} />
            </View>
            <Text style={styles.dialogTitle}>Eliminar deuda</Text>
            <Text style={styles.dialogBody}>
              {positive ? 'A tu favor con' : 'Le debes a'}{' '}
              <Text style={styles.dialogPerson}>{debt.person}</Text>
              {debt.description ? `\n${debt.description}` : ''}
              {'\n'}
              <Text style={[styles.dialogAmount, { color: accentColor }]}>
                {positive ? '+' : '−'}${Math.abs(debt.amount).toLocaleString('es-CL')}
              </Text>
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => { setConfirmVisible(false); onDelete(debt.id); }}
              >
                <Text style={styles.deleteBtnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    color: Colors.text,
    marginTop: 3,
    fontWeight: '500',
  },
  descEmpty: {
    color: Colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dialog: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  dialogPerson: {
    fontWeight: '700',
    color: Colors.text,
  },
  dialogAmount: {
    fontWeight: '700',
    fontSize: 15,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
