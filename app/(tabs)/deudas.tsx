import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ScrollView, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDebtsStore } from '../../store/debtsStore';
import { useUserConfigStore } from '../../store/userConfigStore';
import { DebtCard } from '../../components/debts/DebtCard';
import { Debt } from '../../types';
import { useT } from '../../services/i18n';
import { Colors } from '../../constants/colors';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

interface PersonGroup {
  person: string;
  net: number;
  debts: Debt[];
}

// ─── Person row ───────────────────────────────────────────────────────────────

function PersonRow({ group, onPress }: { group: PersonGroup; onPress: () => void }) {
  const t = useT();
  const { net, person, debts } = group;
  const color = net > 0 ? Colors.success : net < 0 ? Colors.danger : Colors.textMuted;

  return (
    <TouchableOpacity style={styles.personRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.personAvatar, { backgroundColor: color + '22' }]}>
        <Text style={[styles.personInitial, { color }]}>
          {person[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>

      <View style={styles.personInfo}>
        <Text style={styles.personName}>{person}</Text>
        <Text style={styles.personMeta}>
          {t.balances.entries(debts.length)}
        </Text>
      </View>

      <View style={styles.personRight}>
        <Text style={[styles.personNet, { color, fontFamily: MONO }]}>
          {net > 0 ? '+' : net < 0 ? '−' : ''}${Math.abs(net).toLocaleString('es-CL')}
        </Text>
        <Text style={[styles.personDirection, { color }]}>
          {net > 0 ? t.balances.inYourFavor : net < 0 ? t.balances.youOweTag : t.balances.settled}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SaldosScreen() {
  const t = useT();
  const { debts, loading, fetchDebts, addDebt, markPaid, deleteDebt } = useDebtsStore();
  const { persons, addPerson } = useUserConfigStore();

  const [formVisible, setFormVisible] = useState(false);
  const [personInput, setPersonInput] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'they-owe' | 'i-owe'>('they-owe');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  // Pre-fill person when opening form from detail
  const [prefillPerson, setPrefillPerson] = useState<string | null>(null);

  useEffect(() => { fetchDebts(); }, []);

  // Group debts by person, sorted by |net| descending
  const personGroups = useMemo<PersonGroup[]>(() => {
    const map = new Map<string, Debt[]>();
    for (const d of debts) {
      if (!map.has(d.person)) map.set(d.person, []);
      map.get(d.person)!.push(d);
    }
    return [...map.entries()]
      .map(([person, ds]) => ({
        person,
        net: ds.reduce((s, d) => s + d.amount, 0),
        debts: ds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [debts]);

  const owedToMe = debts.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0);
  const iOwe = debts.filter((d) => d.amount < 0).reduce((s, d) => s + Math.abs(d.amount), 0);
  const net = owedToMe - iOwe;

  const openForm = (prefill?: string) => {
    setPrefillPerson(prefill ?? null);
    setPersonInput(prefill ?? '');
    setAmount('');
    setType('they-owe');
    setDescription('');
    setFormVisible(true);
  };

  const handleAdd = async () => {
    const num = parseInt(amount.replace(/\D/g, ''), 10);
    if (!personInput.trim() || !num) {
      Alert.alert(t.common.error, t.balances.completePersonAmount);
      return;
    }
    setSaving(true);
    try {
      await addDebt({
        person: personInput.trim(),
        amount: type === 'they-owe' ? num : -num,
        description: description || null,
        date: today(),
        paid: false,
      });
      await addPerson(personInput.trim());
      setFormVisible(false);
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setSaving(false);
    }
  };

  const selectedGroup = selectedPerson
    ? personGroups.find((g) => g.person === selectedPerson) ?? null
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Summary bar */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t.balances.owedToYou}</Text>
          <Text style={[styles.summaryValue, { color: Colors.success, fontFamily: MONO }]}>
            +${owedToMe.toLocaleString('es-CL')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t.balances.youOwe}</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger, fontFamily: MONO }]}>
            −${iOwe.toLocaleString('es-CL')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t.balances.net}</Text>
          <Text style={[styles.summaryValue, { color: net >= 0 ? Colors.success : Colors.danger, fontFamily: MONO }]}>
            {net >= 0 ? '+' : '−'}${Math.abs(net).toLocaleString('es-CL')}
          </Text>
        </View>
      </View>

      {/* Person list */}
      {loading && personGroups.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={personGroups}
          keyExtractor={(g) => g.person}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchDebts}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <PersonRow group={item} onPress={() => setSelectedPerson(item.person)} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>⇌</Text>
              <Text style={styles.emptyTitle}>{t.balances.noBalancesTitle}</Text>
              <Text style={styles.emptySubtitle}>{t.balances.noBalancesSub}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openForm()} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ─── Person detail modal ─── */}
      <Modal
        visible={selectedPerson !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPerson(null)}
      >
        {selectedGroup && (
          <View style={styles.detailRoot}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedPerson(null)} style={styles.detailCloseBtn}>
                <Ionicons name="chevron-down" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.detailTitleGroup}>
                <Text style={styles.detailName}>{selectedGroup.person}</Text>
                <View style={[
                  styles.detailNetBadge,
                  { backgroundColor: (selectedGroup.net >= 0 ? Colors.success : Colors.danger) + '22' },
                ]}>
                  <Text style={[
                    styles.detailNetText,
                    { color: selectedGroup.net >= 0 ? Colors.success : Colors.danger, fontFamily: MONO },
                  ]}>
                    {selectedGroup.net >= 0 ? '+' : '−'}${Math.abs(selectedGroup.net).toLocaleString('es-CL')}
                  </Text>
                  <Text style={[
                    styles.detailNetLabel,
                    { color: selectedGroup.net >= 0 ? Colors.success : Colors.danger },
                  ]}>
                    {selectedGroup.net > 0 ? t.balances.inYourFavor : selectedGroup.net < 0 ? t.balances.youOweTag : t.balances.settled}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { setSelectedPerson(null); openForm(selectedGroup.person); }}
                style={styles.detailAddBtn}
              >
                <Ionicons name="add" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedGroup.debts}
              keyExtractor={(d) => d.id}
              renderItem={({ item }) => (
                <DebtCard
                  debt={item}
                  onMarkPaid={markPaid}
                  onDelete={deleteDebt}
                />
              )}
              contentContainerStyle={selectedGroup.debts.length === 0 ? { flex: 1 } : undefined}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyIcon}>◎</Text>
                  <Text style={styles.emptyTitle}>{t.balances.noEntries}</Text>
                </View>
              }
            />
          </View>
        )}
      </Modal>

      {/* ─── New entry modal ─── */}
      <Modal visible={formVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFormVisible(false)}>
              <Text style={styles.cancel}>{t.common.cancel}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t.balances.newBalance}</Text>
            <TouchableOpacity onPress={handleAdd} disabled={saving}>
              <Text style={[styles.save, saving && { opacity: 0.4 }]}>
                {saving ? t.common.saving : t.common.save}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t.balances.type}</Text>
            <View style={styles.segmented}>
              {(['they-owe', 'i-owe'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.segment, type === opt && styles.segmentActive]}
                  onPress={() => setType(opt)}
                >
                  <Text style={[styles.segmentText, type === opt && styles.segmentTextActive]}>
                    {opt === 'they-owe' ? t.balances.theyOweMe : t.balances.iOwe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t.balances.person}</Text>
            <TextInput
              style={styles.input}
              value={personInput}
              onChangeText={setPersonInput}
              placeholder={t.common.name}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />

            {/* Quick-select persons */}
            {persons.length > 0 && (
              <View style={styles.personChips}>
                {persons.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.personChip,
                      personInput === p && { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
                    ]}
                    onPress={() => setPersonInput(p)}
                  >
                    {personInput === p && (
                      <View style={[styles.chipDot, { backgroundColor: Colors.primary }]} />
                    )}
                    <Text style={[
                      styles.personChipText,
                      personInput === p && { color: Colors.primary, fontWeight: '700' },
                    ]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>{t.balances.amountCLP}</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amount ? parseInt(amount, 10).toLocaleString('es-CL') : ''}
              onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>{t.balances.description}</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder={t.common.optional}
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

  // Summary
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

  // Person list
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  personInitial: {
    fontSize: 17,
    fontWeight: '700',
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  personMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  personRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  personNet: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  personDirection: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chevron: {
    marginLeft: 8,
  },

  // Empty / center
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyIcon: { fontSize: 36, color: Colors.textMuted, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted },

  // FAB
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

  // Detail modal
  detailRoot: { flex: 1, backgroundColor: Colors.background },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  detailCloseBtn: {
    padding: 2,
    marginRight: 8,
  },
  detailTitleGroup: {
    flex: 1,
    gap: 6,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  detailNetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailNetText: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  detailNetLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailAddBtn: {
    padding: 6,
    marginLeft: 8,
  },

  // New entry form
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

  // Person chips
  personChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  personChip: {
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
  personChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
