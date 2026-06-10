import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
  NestableScrollContainer,
  NestableDraggableFlatList,
} from 'react-native-draggable-flatlist';
import { Colors } from '../../constants/colors';
import { useUserConfigStore } from '../../store/userConfigStore';
import { countTransactionsByField } from '../../services/transactions';
import { useT, LOCALES } from '../../services/i18n';
import { useLocaleStore } from '../../store/localeStore';

interface EditingItem {
  original: string;
  value: string;
}

function DragHandle() {
  return (
    <View style={styles.dragHandle}>
      <View style={styles.dragLine} />
      <View style={styles.dragLine} />
      <View style={styles.dragLine} />
    </View>
  );
}

export default function SettingsScreen() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const {
    categories, paymentMethods,
    addCategory, removeCategory, renameCategory, reorderCategories,
    addPaymentMethod, removePaymentMethod, renamePaymentMethod, reorderPaymentMethods,
  } = useUserConfigStore();

  const [editingCategory, setEditingCat] = useState<EditingItem | null>(null);
  const [editingPayment, setEditingPay] = useState<EditingItem | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newPayment, setNewPayment] = useState('');
  const [addingCategory, setAddingCat] = useState(false);
  const [addingPayment, setAddingPay] = useState(false);
  const [savingCategory, setSavingCat] = useState(false);
  const [savingPayment, setSavingPay] = useState(false);

  const handleSaveRenameCategory = async () => {
    if (!editingCategory) return;
    const newName = editingCategory.value.trim();
    if (!newName) { setEditingCat(null); return; }
    if (newName !== editingCategory.original) {
      if (categories.includes(newName)) {
        Alert.alert(t.settings.exists, t.settings.categoryExists);
        return;
      }
      await renameCategory(editingCategory.original, newName);
    }
    setEditingCat(null);
  };

  const handleSaveRenamePayment = async () => {
    if (!editingPayment) return;
    const newName = editingPayment.value.trim();
    if (!newName) { setEditingPay(null); return; }
    if (newName !== editingPayment.original) {
      if (paymentMethods.includes(newName)) {
        Alert.alert(t.settings.exists, t.settings.methodExists);
        return;
      }
      await renamePaymentMethod(editingPayment.original, newName);
    }
    setEditingPay(null);
  };

  const handleAddCategory = async () => {
    const val = newCategory.trim();
    if (!val) return;
    if (categories.includes(val)) {
      Alert.alert(t.settings.exists, t.settings.categoryExists);
      return;
    }
    setSavingCat(true);
    try {
      await addCategory(val);
      setNewCategory('');
      setAddingCat(false);
    } finally {
      setSavingCat(false);
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    let count = 0;
    try { count = await countTransactionsByField('category', cat); } catch {}
    const warn = count > 0 ? t.settings.categoryInUse(count, cat) : '';
    Alert.alert(t.settings.deleteCategoryTitle, `${t.settings.deleteConfirm(cat)}${warn}`, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => removeCategory(cat) },
    ]);
  };

  const handleAddPayment = async () => {
    const val = newPayment.trim();
    if (!val) return;
    if (paymentMethods.includes(val)) {
      Alert.alert(t.settings.exists, t.settings.methodExists);
      return;
    }
    setSavingPay(true);
    try {
      await addPaymentMethod(val);
      setNewPayment('');
      setAddingPay(false);
    } finally {
      setSavingPay(false);
    }
  };

  const handleRemovePayment = async (method: string) => {
    let count = 0;
    try { count = await countTransactionsByField('payment_method', method); } catch {}
    const warn = count > 0 ? t.settings.methodInUse(count, method) : '';
    Alert.alert(t.settings.deleteMethodTitle, `${t.settings.deleteConfirm(method)}${warn}`, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => removePaymentMethod(method) },
    ]);
  };

  const renderCategoryItem = ({ item, drag, isActive }: RenderItemParams<string>) => {
    const isEditing = editingCategory?.original === item;
    return (
      <ScaleDecorator>
        <View style={[styles.row, isActive && styles.rowActive]}>
          <TouchableOpacity onPressIn={drag} style={styles.dragHandleWrap}>
            <DragHandle />
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editingCategory.value}
              onChangeText={(v) => setEditingCat({ original: item, value: v })}
              autoFocus
              onSubmitEditing={handleSaveRenameCategory}
              returnKeyType="done"
              placeholderTextColor={Colors.textMuted}
            />
          ) : (
            <TouchableOpacity
              style={styles.itemLabelWrap}
              onPress={() => setEditingCat({ original: item, value: item })}
            >
              <Text style={styles.itemText}>{item}</Text>
            </TouchableOpacity>
          )}

          {isEditing ? (
            <TouchableOpacity onPress={handleSaveRenameCategory} style={styles.confirmSmall}>
              <Text style={styles.confirmSmallText}>✓</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => handleRemoveCategory(item)} hitSlop={8} style={styles.deleteWrap}>
              <Text style={styles.deleteBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  const renderPaymentItem = ({ item, drag, isActive }: RenderItemParams<string>) => {
    const isEditing = editingPayment?.original === item;
    return (
      <ScaleDecorator>
        <View style={[styles.row, isActive && styles.rowActive]}>
          <TouchableOpacity onPressIn={drag} style={styles.dragHandleWrap}>
            <DragHandle />
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editingPayment.value}
              onChangeText={(v) => setEditingPay({ original: item, value: v })}
              autoFocus
              onSubmitEditing={handleSaveRenamePayment}
              returnKeyType="done"
              placeholderTextColor={Colors.textMuted}
            />
          ) : (
            <TouchableOpacity
              style={styles.itemLabelWrap}
              onPress={() => setEditingPay({ original: item, value: item })}
            >
              <Text style={styles.itemText}>{item}</Text>
            </TouchableOpacity>
          )}

          {isEditing ? (
            <TouchableOpacity onPress={handleSaveRenamePayment} style={styles.confirmSmall}>
              <Text style={styles.confirmSmallText}>✓</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => handleRemovePayment(item)} hitSlop={8} style={styles.deleteWrap}>
              <Text style={styles.deleteBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.settings.title}</Text>
      </View>

      <NestableScrollContainer contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>{t.settings.language}</Text>
        <View style={styles.section}>
          <View style={styles.langRow}>
            {LOCALES.map((l) => {
              const active = locale === l.code;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langOption, active && styles.langOptionActive]}
                  onPress={() => setLocale(l.code)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langText, active && styles.langTextActive]}>{l.label}</Text>
                  {active && <Text style={styles.langCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.settings.categories}</Text>
        <View style={styles.section}>
          <NestableDraggableFlatList
            data={categories}
            keyExtractor={(item) => item}
            onDragEnd={({ data }) => reorderCategories(data)}
            renderItem={renderCategoryItem}
            activationDistance={10}
          />
          {addingCategory ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder={t.settings.newCategory}
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleAddCategory}
              />
              <TouchableOpacity onPress={handleAddCategory} disabled={savingCategory} style={styles.confirmBtn}>
                {savingCategory
                  ? <ActivityIndicator size="small" color={Colors.background} />
                  : <Text style={styles.confirmBtnText}>{t.common.add}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingCat(false); setNewCategory(''); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addTrigger} onPress={() => setAddingCat(true)}>
              <Text style={styles.addTriggerText}>{t.settings.addCategory}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t.settings.paymentMethods}</Text>
        <View style={styles.section}>
          <NestableDraggableFlatList
            data={paymentMethods}
            keyExtractor={(item) => item}
            onDragEnd={({ data }) => reorderPaymentMethods(data)}
            renderItem={renderPaymentItem}
            activationDistance={10}
          />
          {addingPayment ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newPayment}
                onChangeText={setNewPayment}
                placeholder={t.settings.newMethod}
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleAddPayment}
              />
              <TouchableOpacity onPress={handleAddPayment} disabled={savingPayment} style={styles.confirmBtn}>
                {savingPayment
                  ? <ActivityIndicator size="small" color={Colors.background} />
                  : <Text style={styles.confirmBtnText}>{t.common.add}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingPay(false); setNewPayment(''); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addTrigger} onPress={() => setAddingPay(true)}>
              <Text style={styles.addTriggerText}>{t.settings.addMethod}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </NestableScrollContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  body: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 10,
    marginLeft: 2,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
  },
  langOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  langOptionActive: {
    backgroundColor: Colors.primaryDim,
  },
  langText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  langTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  langCheck: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  rowActive: {
    backgroundColor: Colors.surfaceActive,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dragHandleWrap: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    gap: 3,
    width: 18,
    alignItems: 'center',
  },
  dragLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.textMuted,
  },
  itemLabelWrap: {
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '400',
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  confirmSmall: {
    marginLeft: 10,
    paddingHorizontal: 6,
  },
  confirmSmallText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
  },
  deleteWrap: {
    paddingLeft: 8,
  },
  deleteBtn: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  addTrigger: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addTriggerText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.text,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 76,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: Colors.background,
    fontWeight: '800',
    fontSize: 13,
  },
  cancelBtn: {
    padding: 8,
  },
  cancelBtnText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
