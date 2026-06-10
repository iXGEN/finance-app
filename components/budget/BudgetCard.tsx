import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Platform, KeyboardAvoidingView, TouchableWithoutFeedback,
} from 'react-native';
import { BudgetSummaryItem } from '../../types';
import { Colors } from '../../constants/colors';
import { CATEGORY_COLORS } from '../../constants/categories';
import { useT } from '../../services/i18n';

interface Props {
  item: BudgetSummaryItem;
  month: string;
  onUpdate: (month: string, category: string, budget: number) => Promise<void>;
  onPressCategory?: (category: string) => void;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export function BudgetCard({ item, month, onUpdate, onPressCategory }: Props) {
  const t = useT();
  const [modalVisible, setModalVisible] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const color = CATEGORY_COLORS[item.category] ?? Colors.primary;
  const pct = item.budget > 0 ? Math.min(item.spent / item.budget, 1) : 0;
  const over = item.budget > 0 && item.spent > item.budget;
  const hasActivity = item.budget > 0 || item.spent > 0;

  const openModal = () => {
    setValue(item.budget > 0 ? String(item.budget) : '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    if (!num || num <= 0) return;
    setSaving(true);
    try {
      await onUpdate(month, item.category, num);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setModalVisible(false);
  };

  return (
    <>
      <View style={[styles.card, !hasActivity && styles.cardDim]}>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.categoryTap}
            onPress={() => onPressCategory?.(item.category)}
            disabled={!onPressCategory}
            activeOpacity={0.6}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.name, !hasActivity && styles.nameDim]} numberOfLines={1}>
              {item.category}
            </Text>
          </TouchableOpacity>
          <View style={styles.right}>
            <Text style={[styles.spent, over && styles.over, { fontFamily: MONO }]}>
              ${item.spent.toLocaleString('es-CL')}
            </Text>
            <TouchableOpacity onPress={openModal}>
              <Text style={[styles.budget, item.budget === 0 && styles.budgetEmpty]}>
                {item.budget > 0
                  ? `/ $${item.budget.toLocaleString('es-CL')}`
                  : t.budget.addBudget}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {item.budget > 0 && (
          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                { width: `${pct * 100}%`, backgroundColor: over ? Colors.danger : color },
              ]}
            />
          </View>
        )}

        {item.budget > 0 && (
          <View style={styles.stats}>
            <Text style={styles.statText}>
              {over
                ? t.budget.exceededAmount(`$${(item.spent - item.budget).toLocaleString('es-CL')}`)
                : t.budget.availableAmount(`$${(item.budget - item.spent).toLocaleString('es-CL')}`)}
            </Text>
            <Text style={[styles.pctText, over && { color: Colors.danger }]}>
              {Math.round(pct * 100)}%
            </Text>
          </View>
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetDot, { backgroundColor: color }]} />
              <Text style={styles.sheetTitle} numberOfLines={1}>{item.category}</Text>
            </View>

            <Text style={styles.sheetLabel}>{t.budget.monthlyBudgetCLP}</Text>

            <TextInput
              style={styles.sheetInput}
              value={value ? parseInt(value, 10).toLocaleString('es-CL') : ''}
              onChangeText={(text) => setValue(text.replace(/\D/g, ''))}
              keyboardType="numeric"
              autoFocus
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={handleSave}
              returnKeyType="done"
              selectTextOnFocus
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelAction} onPress={handleClose}>
                <Text style={styles.cancelActionText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveAction, saving && styles.saveActionDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveActionText}>
                  {saving ? t.common.saving : t.common.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardDim: {
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 10,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  nameDim: {
    color: Colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  spent: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  over: {
    color: Colors.danger,
  },
  budget: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  budgetEmpty: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  barBg: {
    height: 5,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  statText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sheetDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    flexShrink: 0,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sheetInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: MONO,
    marginBottom: 20,
    textAlign: 'right',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelAction: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveAction: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveActionDisabled: {
    opacity: 0.5,
  },
  saveActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.background,
  },
});
