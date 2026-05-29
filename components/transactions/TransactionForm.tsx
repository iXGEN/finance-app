import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Switch, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { TransactionInsert } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (tx: Omit<TransactionInsert, 'week' | 'month'>) => Promise<void>;
}

function todayStr(): string {
  return new Date().toISOString().substring(0, 10);
}

export function TransactionForm({ visible, onClose, onSubmit }: Props) {
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [isFixed, setIsFixed] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDate(todayStr());
    setCategory(CATEGORIES[0]);
    setDescription('');
    setAmount('');
    setPaymentMethod(PAYMENT_METHODS[0]);
    setIsFixed(false);
    setNotes('');
  };

  const handleSubmit = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
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
        registered: false,
      });
      reset();
      onClose();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New expense</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={saving}>
          <Text style={[styles.save, saving && styles.disabled]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <Label>Date</Label>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <Label>Amount (CLP)</Label>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="25000"
          keyboardType="numeric"
        />

        <Label>Category</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Label>Description</Label>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
        />

        <Label>Payment method</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, paymentMethod === m && styles.chipActive]}
              onPress={() => setPaymentMethod(m)}
            >
              <Text style={[styles.chipText, paymentMethod === m && styles.chipTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Fixed expense</Text>
          <Switch value={isFixed} onValueChange={setIsFixed} trackColor={{ true: Colors.primary }} />
        </View>

        <Label>Notes</Label>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          multiline
          numberOfLines={3}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cancel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  save: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.text,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabel: {
    fontSize: 15,
    color: Colors.text,
  },
});
