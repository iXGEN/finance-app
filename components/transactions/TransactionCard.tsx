import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, parseSplit } from '../../types';
import { Colors } from '../../constants/colors';
import { CATEGORY_COLORS } from '../../constants/categories';
import { shortMonthName } from '../../services/dates';
import { useT } from '../../services/i18n';
import { useLocaleStore } from '../../store/localeStore';

interface Props {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`;
}

export function TransactionCard({ transaction, onEdit, onDelete }: Props) {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const categoryColor = CATEGORY_COLORS[transaction.category] ?? Colors.primary;
  const [, m, d] = transaction.date.split('-');
  const day = parseInt(d, 10).toString();
  const month = shortMonthName(parseInt(m, 10), locale);
  const splitData = parseSplit(transaction.notes);

  return (
    <>
      <View style={styles.card}>
        <View style={[styles.dateCol, { borderColor: categoryColor + '40' }]}>
          <Text style={[styles.dateDay, { color: categoryColor }]}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.category} numberOfLines={1}>{transaction.category}</Text>
          {transaction.description ? (
            <Text style={styles.description} numberOfLines={1}>{transaction.description}</Text>
          ) : null}
          {splitData && (
            <Text style={styles.splitParticipants} numberOfLines={1}>
              {splitData.participants.map((p) =>
                `${p.name} $${p.amount.toLocaleString('es-CL')}`
              ).join(' · ')}
            </Text>
          )}
          <View style={styles.meta}>
            {transaction.payment_method ? (
              <Text style={styles.metaText}>{transaction.payment_method}</Text>
            ) : null}
            {transaction.is_fixed ? (
              <View style={styles.fixedBadge}>
                <Text style={styles.fixedText}>{t.tx.fixedBadge}</Text>
              </View>
            ) : null}
            {splitData ? (
              <View style={styles.splitBadge}>
                <Text style={styles.splitText}>{t.tx.splitBadge}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: categoryColor }]}>{formatAmount(transaction.amount)}</Text>
          {splitData && (
            <Text style={styles.splitTotal}>
              {t.tx.ofTotal(`$${splitData.total.toLocaleString('es-CL')}`)}
            </Text>
          )}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onEdit(transaction)} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="pencil-outline" size={15} color={Colors.textMuted} />
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
            <View style={[styles.dialogIcon, { backgroundColor: Colors.danger + '15' }]}>
              <Ionicons name="trash-outline" size={26} color={Colors.danger} />
            </View>
            <Text style={styles.dialogTitle}>{t.tx.deleteExpenseTitle}</Text>
            <Text style={styles.dialogBody}>
              {transaction.category}
              {transaction.description ? `\n${transaction.description}` : ''}
              {'\n'}
              <Text style={[styles.dialogAmount, { color: categoryColor }]}>
                {formatAmount(transaction.amount)}
              </Text>
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => { setConfirmVisible(false); onDelete(transaction.id); }}
              >
                <Text style={styles.deleteBtnText}>{t.common.delete}</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  dateCol: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
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
  splitBadge: {
    backgroundColor: Colors.successDim,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  splitText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.success,
    letterSpacing: 0.8,
  },
  splitParticipants: {
    fontSize: 11,
    color: Colors.success,
    marginTop: 2,
    fontWeight: '500',
  },
  splitTotal: {
    fontSize: 10,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: MONO,
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
