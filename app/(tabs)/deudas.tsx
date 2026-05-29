import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebtsStore } from '../../store/debtsStore';
import { DebtCard } from '../../components/debts/DebtCard';
import { Colors } from '../../constants/colors';

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

  const handleAdd = async () => {
    const num = parseInt(amount.replace(/\D/g, ''), 10);
    if (!person.trim() || !num) {
      Alert.alert('Error', 'Fill in person and amount');
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
          <Text style={styles.summaryLabel}>Owed to me</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            +${owedToMe.toLocaleString('es-CL')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>I owe</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>
            −${iOwe.toLocaleString('es-CL')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryValue, { color: owedToMe - iOwe >= 0 ? Colors.success : Colors.danger }]}>
            {owedToMe - iOwe >= 0 ? '+' : '−'}${Math.abs(owedToMe - iOwe).toLocaleString('es-CL')}
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
              <Text style={styles.empty}>No pending debts</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setFormVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={formVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setFormVisible(false)}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New debt</Text>
          <TouchableOpacity onPress={handleAdd} disabled={saving}>
            <Text style={[styles.save, saving && { opacity: 0.5 }]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.segmented}>
            {(['they-owe', 'i-owe'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.segment, type === t && styles.segmentActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>
                  {t === 'they-owe' ? 'They owe me' : 'I owe'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Person</Text>
          <TextInput style={styles.input} value={person} onChangeText={setPerson} placeholder="Name" />

          <Text style={styles.fieldLabel}>Amount (CLP)</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="50000" />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" />

          <View style={{ height: 40 }} />
        </ScrollView>
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
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  divider: { width: 1, backgroundColor: Colors.border },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { color: Colors.textMuted },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cancel: { fontSize: 16, color: Colors.textSecondary },
  save: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  modalBody: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, fontSize: 15, color: Colors.text,
  },
  segmented: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  segment: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: Colors.surface },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 14, color: Colors.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
});
