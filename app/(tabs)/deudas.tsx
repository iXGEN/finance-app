import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebtsStore } from '../../store/debtsStore';
import { DebtCard } from '../../components/debts/DebtCard';
import { Colors } from '../../constants/colors';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

export default function DebtsScreen() {
  const { debts, loading, fetchDebts, addDebt, markPaid, deleteDebt } = useDebtsStore();
  const [formVisible, setFormVisible] = useState(false);
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'they-owe' | 'i-owe'>('they-owe');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDebts(); }, []);

  const owedToMe = debts.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0);
  const iOwe = debts.filter((d) => d.amount < 0).reduce((s, d) => s + Math.abs(d.amount), 0);
  const net = owedToMe - iOwe;

  const handleAdd = async () => {
    const num = parseInt(amount.replace(/\D/g, ''), 10);
    if (!person.trim() || !num) {
      Alert.alert('Error', 'Completa persona y monto');
      return;
    }
    setSaving(true);
    try {
      await addDebt({
        person: person.trim(),
        amount: type === 'they-owe' ? num : -num,
        description: description || null,
        date: today(),
        paid: false,
      });
      setPerson(''); setAmount(''); setDescription('');
      setFormVisible(false);
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Me deben</Text>
          <Text style={[styles.summaryValue, { color: Colors.success, fontFamily: MONO }]}>
            +${owedToMe.toLocaleString('es-CL')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Debo</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger, fontFamily: MONO }]}>
            −${iOwe.toLocaleString('es-CL')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Neto</Text>
          <Text style={[styles.summaryValue, { color: net >= 0 ? Colors.success : Colors.danger, fontFamily: MONO }]}>
            {net >= 0 ? '+' : '−'}${Math.abs(net).toLocaleString('es-CL')}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={debts}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DebtCard debt={item} onMarkPaid={markPaid} onDelete={deleteDebt} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.emptyTitle}>Sin deudas pendientes</Text>
              <Text style={styles.emptySubtitle}>Toca + para registrar una</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setFormVisible(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={formVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFormVisible(false)}>
              <Text style={styles.cancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nueva deuda</Text>
            <TouchableOpacity onPress={handleAdd} disabled={saving}>
              <Text style={[styles.save, saving && { opacity: 0.4 }]}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.segmented}>
              {(['they-owe', 'i-owe'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.segment, type === t && styles.segmentActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>
                    {t === 'they-owe' ? 'Me deben' : 'Yo debo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Persona</Text>
            <TextInput
              style={styles.input}
              value={person}
              onChangeText={setPerson}
              placeholder="Nombre"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Monto (CLP)</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Opcional"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summary: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyIcon: { fontSize: 36, color: Colors.textMuted, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: Colors.background, fontSize: 30, lineHeight: 34, fontWeight: '300' },
  modalRoot: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cancel: { fontSize: 15, color: Colors.textSecondary },
  save: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  modalBody: { flex: 1, padding: 16 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 13, fontSize: 15, color: Colors.text,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  segmented: {
    flexDirection: 'row', borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  segment: { flex: 1, padding: 12, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.primaryDim },
  segmentText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  segmentTextActive: { color: Colors.primary, fontWeight: '700' },
});
