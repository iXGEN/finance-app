import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Switch, Alert, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Transaction, TransactionInsert, SplitEntry, parseSplit, encodeSplit } from '../../types';
import { useUserConfigStore } from '../../store/userConfigStore';
import { useDebtsStore } from '../../store/debtsStore';
import { CATEGORY_COLORS } from '../../constants/categories';

const DEBT_PAYMENT_METHOD = 'Deuda';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (tx: Omit<TransactionInsert, 'week' | 'month'>) => Promise<void>;
  initialValues?: Transaction;
}

interface SplitParticipant {
  name: string;
  amount: string;
}

function todayStr(): string {
  return new Date().toISOString().substring(0, 10);
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function SearchableChips({
  items,
  selected,
  onSelect,
  onAdd,
  getColor,
  placeholder,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
  onAdd: (v: string) => Promise<void>;
  getColor?: (item: string) => string;
  placeholder: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? items.filter((i) => i.toLowerCase().includes(search.toLowerCase()))
    : items;
  const canAdd = search.trim() && !items.some((i) => i.toLowerCase() === search.trim().toLowerCase());

  const handleAdd = async () => {
    const name = search.trim();
    await onAdd(name);
    onSelect(name);
    setSearch('');
  };

  return (
    <View>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={15} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipGrid}>
        {filtered.map((item) => {
          const active = selected === item;
          const color = getColor ? (getColor(item) ?? Colors.primary) : Colors.primary;
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: color + '22', borderColor: color }
                  : undefined,
              ]}
              onPress={() => { onSelect(item); setSearch(''); }}
            >
              {active && <View style={[styles.chipDot, { backgroundColor: color }]} />}
              <Text style={[styles.chipText, active && { color, fontWeight: '700' }]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}

        {canAdd && (
          <TouchableOpacity style={[styles.chip, styles.chipAdd]} onPress={handleAdd}>
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.chipAddText}>Agregar "{search.trim()}"</Text>
          </TouchableOpacity>
        )}

        {filtered.length === 0 && !canAdd && (
          <Text style={styles.noResults}>Sin resultados</Text>
        )}
      </View>
    </View>
  );
}

export function TransactionForm({ visible, onClose, onSubmit, initialValues }: Props) {
  const { categories, paymentMethods, persons, addCategory, addPaymentMethod, addPerson } = useUserConfigStore();
  const { addDebt, deleteDebt } = useDebtsStore();

  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isFixed, setIsFixed] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Deuda payment method
  const [debtPerson, setDebtPerson] = useState('');

  // Split feature
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>([{ name: 'Yo', amount: '' }]);

  const isEditing = !!initialValues;
  const totalAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isDebtMethod = paymentMethod === DEBT_PAYMENT_METHOD && !splitEnabled;
  const splitSum = splitParticipants.reduce((s, p) => s + (parseInt(p.amount.replace(/\D/g, ''), 10) || 0), 0);
  const splitRemaining = totalAmount - splitSum;

  const knownPersons = persons;

  useEffect(() => {
    if (!visible) return;
    setDebtPerson('');
    if (initialValues) {
      setDate(initialValues.date);
      setCategory(initialValues.category);
      setDescription(initialValues.description ?? '');
      setPaymentMethod(initialValues.payment_method ?? '');
      setIsFixed(initialValues.is_fixed);
      const split = parseSplit(initialValues.notes);
      if (split) {
        setAmount(String(split.total));
        setSplitEnabled(true);
        setSplitParticipants([
          { name: 'Yo', amount: String(initialValues.amount) },
          ...split.participants.map((p) => ({ name: p.name, amount: String(p.amount) })),
        ]);
        setNotes(split.notes);
      } else {
        setAmount(String(initialValues.amount));
        setSplitEnabled(false);
        setSplitParticipants([{ name: 'Yo', amount: '' }]);
        setNotes(initialValues.notes ?? '');
      }
    } else {
      setDate(todayStr());
      setCategory(categories[0] ?? '');
      setDescription('');
      setAmount('');
      setPaymentMethod(paymentMethods[0] ?? '');
      setIsFixed(false);
      setNotes('');
      setSplitEnabled(false);
      setSplitParticipants([{ name: 'Yo', amount: '' }]);
    }
  }, [visible]);

  useEffect(() => {
    if (categories.length && !category) setCategory(categories[0]);
  }, [categories]);

  useEffect(() => {
    if (paymentMethods.length && !paymentMethod) setPaymentMethod(paymentMethods[0]);
  }, [paymentMethods]);

  const splitEqually = () => {
    if (!totalAmount || splitParticipants.length < 2) return;
    const each = Math.floor(totalAmount / splitParticipants.length);
    const remainder = totalAmount - each * splitParticipants.length;
    setSplitParticipants((prev) =>
      prev.map((p, i) => ({ ...p, amount: String(i === 0 ? each + remainder : each) }))
    );
  };

  const addSplitPerson = () => {
    setSplitParticipants((prev) => [...prev, { name: '', amount: '' }]);
  };

  const updateSplitParticipant = (index: number, field: 'name' | 'amount', value: string) => {
    setSplitParticipants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeSplitParticipant = (index: number) => {
    setSplitParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    let txAmount = amountNum;
    let txNotes: string | null = notes || null;

    if (splitEnabled) {
      const myPart = parseInt(splitParticipants[0]?.amount?.replace(/\D/g, '') ?? '', 10);
      if (!myPart || myPart <= 0) {
        Alert.alert('Error', 'Ingresa tu parte del gasto');
        return;
      }
      if (splitRemaining !== 0) {
        Alert.alert('Error', `Las partes no suman el total ($${amountNum.toLocaleString('es-CL')})`);
        return;
      }
      txAmount = myPart;
    }

    setSaving(true);
    try {
      if (splitEnabled) {
        // If editing: delete previous split debts
        if (isEditing) {
          const oldSplit = parseSplit(initialValues!.notes);
          if (oldSplit) {
            for (const entry of oldSplit.participants) {
              if (entry.debtId) {
                try { await deleteDebt(entry.debtId); } catch {}
              }
            }
          }
        }

        // Create new debts and collect their IDs
        const entries: SplitEntry[] = [];
        for (const p of splitParticipants.slice(1)) {
          const pAmount = parseInt(p.amount.replace(/\D/g, ''), 10);
          if (p.name.trim() && pAmount > 0) {
            const newDebt = await addDebt({
              person: p.name.trim(),
              amount: pAmount,
              description: description || null,
              date,
              paid: false,
            });
            entries.push({ name: p.name.trim(), amount: pAmount, debtId: newDebt.id });
            await addPerson(p.name.trim());
          }
        }
        txNotes = encodeSplit(entries, amountNum, notes);
      } else if (isDebtMethod && debtPerson.trim()) {
        await addDebt({
          person: debtPerson.trim(),
          amount: amountNum,
          description: description || null,
          date,
          paid: false,
        });
        await addPerson(debtPerson.trim());
      }

      await onSubmit({
        date,
        category,
        description: description || null,
        amount: txAmount,
        payment_method: paymentMethod,
        is_fixed: isFixed,
        notes: txNotes,
        registered: initialValues?.registered ?? false,
      });

      onClose();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setSaving(false);
    }
  };

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
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
            <Text style={styles.dateBtnText}>{formatDateDisplay(date)}</Text>
          </TouchableOpacity>

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={new Date(date + 'T12:00:00')}
              mode="date"
              display="calendar"
              onChange={(e: DateTimePickerEvent, d?: Date) => {
                setShowDatePicker(false);
                if (e.type === 'set' && d) setDate(d.toISOString().substring(0, 10));
              }}
            />
          )}

          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="fade" visible={showDatePicker}>
              <TouchableOpacity style={styles.dateOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                <View style={styles.dateSheet}>
                  <View style={styles.dateSheetHeader}>
                    <Text style={styles.dateSheetTitle}>Seleccionar fecha</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.dateSheetDone}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={new Date(date + 'T12:00:00')}
                    mode="date"
                    display="inline"
                    themeVariant="dark"
                    accentColor={Colors.primary}
                    onChange={(_: DateTimePickerEvent, d?: Date) => {
                      if (d) setDate(d.toISOString().substring(0, 10));
                    }}
                    style={styles.datePicker}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          <Label>{splitEnabled ? 'Monto total (CLP)' : 'Monto (CLP)'}</Label>
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={amount ? parseInt(amount, 10).toLocaleString('es-CL') : ''}
            onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />

          <Label>Categoría</Label>
          <SearchableChips
            items={categories}
            selected={category}
            onSelect={setCategory}
            onAdd={addCategory}
            getColor={(cat) => CATEGORY_COLORS[cat] ?? Colors.primary}
            placeholder="Buscar o agregar categoría…"
          />

          <Label>Descripción</Label>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Opcional"
            placeholderTextColor={Colors.textMuted}
          />

          <Label>Método de pago</Label>
          <SearchableChips
            items={paymentMethods}
            selected={paymentMethod}
            onSelect={setPaymentMethod}
            onAdd={addPaymentMethod}
            placeholder="Buscar o agregar método…"
          />

          {/* Debt person picker — shown when payment method is "Deuda" */}
          {isDebtMethod && (
            <View style={styles.debtSection}>
              <Label>¿Quién te debe?</Label>
              <TextInput
                style={styles.input}
                value={debtPerson}
                onChangeText={setDebtPerson}
                placeholder="Nombre de la persona"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
              {knownPersons.length > 0 && (
                <View style={[styles.chipGrid, { marginTop: 10 }]}>
                  {knownPersons.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.chip,
                        debtPerson === p && { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
                      ]}
                      onPress={() => setDebtPerson(p)}
                    >
                      {debtPerson === p && <View style={[styles.chipDot, { backgroundColor: Colors.primary }]} />}
                      <Text style={[styles.chipText, debtPerson === p && { color: Colors.primary, fontWeight: '700' }]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.debtNote}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.debtNoteText}>
                  Se registrará el gasto completo y se añadirá a Saldos como "te deben"
                </Text>
              </View>
            </View>
          )}

          {/* Split toggle */}
          <View style={styles.switchRow}>
            <View style={styles.splitToggleLabel}>
              <Ionicons name="git-branch-outline" size={18} color={splitEnabled ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.switchLabel, splitEnabled && { color: Colors.primary }]}>
                Dividir gasto
              </Text>
            </View>
            <Switch
              value={splitEnabled}
              onValueChange={(v) => {
                setSplitEnabled(v);
                if (v) setSplitParticipants([{ name: 'Yo', amount: '' }]);
              }}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          {/* Split participants section */}
          {splitEnabled && (
            <View style={styles.splitSection}>
              {/* Status bar */}
              <View style={styles.splitStatus}>
                <Text style={styles.splitStatusLabel}>Total: ${totalAmount.toLocaleString('es-CL')}</Text>
                {totalAmount > 0 && (
                  <View style={[
                    styles.splitBadge,
                    { backgroundColor: splitRemaining === 0 ? Colors.successDim : Colors.dangerDim },
                  ]}>
                    <Text style={[
                      styles.splitBadgeText,
                      { color: splitRemaining === 0 ? Colors.success : Colors.danger },
                    ]}>
                      {splitRemaining === 0
                        ? '✓ Completo'
                        : splitRemaining > 0
                          ? `Falta $${splitRemaining.toLocaleString('es-CL')}`
                          : `Exceso $${Math.abs(splitRemaining).toLocaleString('es-CL')}`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Participant rows */}
              {splitParticipants.map((p, i) => (
                <View key={i} style={styles.splitRow}>
                  <View style={styles.splitNameCell}>
                    {i === 0 ? (
                      <View style={styles.splitMeTag}>
                        <Ionicons name="person" size={12} color={Colors.primary} />
                        <Text style={styles.splitMeText}>Yo</Text>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.splitNameInput}
                        value={p.name}
                        onChangeText={(text) => updateSplitParticipant(i, 'name', text)}
                        placeholder="Nombre"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="words"
                      />
                    )}
                  </View>
                  <TextInput
                    style={styles.splitAmountInput}
                    value={p.amount ? parseInt(p.amount, 10).toLocaleString('es-CL') : ''}
                    onChangeText={(text) => updateSplitParticipant(i, 'amount', text.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                  {i > 0 && (
                    <TouchableOpacity onPress={() => removeSplitParticipant(i)} hitSlop={8} style={styles.splitRemoveBtn}>
                      <Ionicons name="close-circle" size={20} color={Colors.danger + 'AA'} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Actions */}
              <View style={styles.splitActions}>
                <TouchableOpacity style={styles.addPersonBtn} onPress={addSplitPerson}>
                  <Ionicons name="person-add-outline" size={15} color={Colors.primary} />
                  <Text style={styles.addPersonBtnText}>Agregar persona</Text>
                </TouchableOpacity>

                {splitParticipants.length > 1 && totalAmount > 0 && (
                  <TouchableOpacity style={styles.equalSplitBtn} onPress={splitEqually}>
                    <Ionicons name="git-merge-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.equalSplitBtnText}>Partes iguales</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.debtNote}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.debtNoteText}>
                  Tu parte se registra como gasto. Las partes ajenas se añaden a Saldos como "te deben"
                </Text>
              </View>
            </View>
          )}

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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipAdd: {
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  chipAddText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  noResults: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
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
  splitToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    gap: 10,
  },
  dateBtnText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  dateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dateSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  dateSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  dateSheetDone: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  datePicker: {
    alignSelf: 'center',
  },

  // Debt payment method section
  debtSection: {
    marginTop: 4,
  },
  debtNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  debtNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },

  // Split section
  splitSection: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 0,
  },
  splitStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  splitStatusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  splitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  splitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  splitNameCell: {
    flex: 1,
  },
  splitMeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  splitMeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  splitNameInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  splitAmountInput: {
    width: 110,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },
  splitRemoveBtn: {
    padding: 2,
  },
  splitActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  addPersonBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderRadius: 10,
    paddingVertical: 10,
  },
  addPersonBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  equalSplitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  equalSplitBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
