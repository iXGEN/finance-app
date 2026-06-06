import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Switch, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Transaction, TransactionInsert } from '../../types';
import { useUserConfigStore } from '../../store/userConfigStore';
import { CATEGORY_COLORS } from '../../constants/categories';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (tx: Omit<TransactionInsert, 'week' | 'month'>) => Promise<void>;
  initialValues?: Transaction;
}

function todayStr(): string {
  return new Date().toISOString().substring(0, 10);
}

export function TransactionForm({ visible, onClose, onSubmit, initialValues }: Props) {
  const { categories, paymentMethods } = useUserConfigStore();
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isFixed, setIsFixed] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialValues) {
      setDate(initialValues.date);
      setCategory(initialValues.category);
      setDescription(initialValues.description ?? '');
      setAmount(String(initialValues.amount));
      setPaymentMethod(initialValues.payment_method ?? '');
      setIsFixed(initialValues.is_fixed);
      setNotes(initialValues.notes ?? '');
    } else {
      setDate(todayStr());
      setCategory(categories[0] ?? '');
      setDescription('');
      setAmount('');
      setPaymentMethod(paymentMethods[0] ?? '');
      setIsFixed(false);
      setNotes('');
    }
  }, [visible]);

  useEffect(() => {
    if (categories.length && !category) setCategory(categories[0]);
  }, [categories]);

  useEffect(() => {
    if (paymentMethods.length && !paymentMethod) setPaymentMethod(paymentMethods[0]);
  }, [paymentMethods]);

  const handleSubmit = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        date,
        category,
        description: description || null,
        amount: amountNum,
        payment_method: paymentMethod,
        is_fixed: isFixed,
        notes: notes || null,
        registered: initialValues?.registered ?? false,
      });
      onClose();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!initialValues;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Editar gasto' : 'Nuevo gasto'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={saving} style={styles.headerBtn}>
            <Text style={[styles.save, saving && styles.disabled]}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <Label>Fecha</Label>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />

          <Label>Monto (CLP)</Label>
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />

          <Label>Categoría</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
            {categories.map((cat) => {
              const active = category === cat;
              const catColor = CATEGORY_COLORS[cat] ?? Colors.primary;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, active && { backgroundColor: catColor + '22', borderColor: catColor }]}
                  onPress={() => setCategory(cat)}
                >
                  {active && <View style={[styles.chipDot, { backgroundColor: catColor }]} />}
                  <Text style={[styles.chipText, active && { color: catColor, fontWeight: '700' }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Label>Descripción</Label>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Opcional"
            placeholderTextColor={Colors.textMuted}
          />

          <Label>Método de pago</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
            {paymentMethods.map((m) => {
              const active = paymentMethod === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, active && styles.chipActivePrimary]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActivePrimary]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Gasto fijo</Text>
            <Switch
              value={isFixed}
              onValueChange={setIsFixed}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          <Label>Notas</Label>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Opcional"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerBtn: {
    minWidth: 70,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cancel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  save: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },
  disabled: {
    opacity: 0.4,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: Colors.text,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
  },
  chipsContent: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
    gap: 5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipActivePrimary: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActivePrimary: {
    color: Colors.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
});
