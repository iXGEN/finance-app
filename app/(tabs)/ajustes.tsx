import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Colors } from '../../constants/colors';
import { useUserConfigStore } from '../../store/userConfigStore';

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

export default function AjustesScreen() {
  const {
    categories, paymentMethods,
    addCategory, removeCategory, renameCategory, reorderCategories,
    addPaymentMethod, removePaymentMethod, renamePaymentMethod, reorderPaymentMethods,
  } = useUserConfigStore();

  const [editingCat, setEditingCat] = useState<EditingItem | null>(null);
  const [editingPay, setEditingPay] = useState<EditingItem | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newPayment, setNewPayment] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [addingPay, setAddingPay] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [savingPay, setSavingPay] = useState(false);

  const handleSaveRenameCategory = async () => {
    if (!editingCat) return;
    const newName = editingCat.value.trim();
    if (!newName) { setEditingCat(null); return; }
    if (newName !== editingCat.original) {
      if (categories.includes(newName)) {
        Alert.alert('Ya existe', 'Esa categoría ya está en la lista.');
        return;
      }
      await renameCategory(editingCat.original, newName);
    }
    setEditingCat(null);
  };

  const handleSaveRenamePayment = async () => {
    if (!editingPay) return;
    const newName = editingPay.value.trim();
    if (!newName) { setEditingPay(null); return; }
    if (newName !== editingPay.original) {
      if (paymentMethods.includes(newName)) {
        Alert.alert('Ya existe', 'Ese método ya está en la lista.');
        return;
      }
      await renamePaymentMethod(editingPay.original, newName);
    }
    setEditingPay(null);
  };

  const handleAddCategory = async () => {
    const val = newCategory.trim();
    if (!val) return;
    if (categories.includes(val)) {
      Alert.alert('Ya existe', 'Esa categoría ya está en la lista.');
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

  const handleRemoveCategory = (cat: string) => {
    Alert.alert('Eliminar categoría', `¿Eliminar "${cat}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeCategory(cat) },
    ]);
  };

  const handleAddPayment = async () => {
    const val = newPayment.trim();
    if (!val) return;
    if (paymentMethods.includes(val)) {
      Alert.alert('Ya existe', 'Ese método ya está en la lista.');
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

  const handleRemovePayment = (method: string) => {
    Alert.alert('Eliminar método', `¿Eliminar "${method}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removePaymentMethod(method) },
    ]);
  };

  const renderCategoryItem = ({ item, drag, isActive }: RenderItemParams<string>) => {
    const isEditing = editingCat?.original === item;
    return (
      <ScaleDecorator>
        <View style={[styles.row, isActive && styles.rowActive]}>
          <TouchableOpacity onPressIn={drag} style={styles.dragHandleWrap}>
            <DragHandle />
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editingCat.value}
              onChangeText={(v) => setEditingCat({ original: item, value: v })}
              autoFocus
              onSubmitEditing={handleSaveRenameCategory}
              returnKeyType="done"
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
    const isEditing = editingPay?.original === item;
    return (
      <ScaleDecorator>
        <View style={[styles.row, isActive && styles.rowActive]}>
          <TouchableOpacity onPressIn={drag} style={styles.dragHandleWrap}>
            <DragHandle />
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editingPay.value}
              onChangeText={(v) => setEditingPay({ original: item, value: v })}
              autoFocus
              onSubmitEditing={handleSaveRenamePayment}
              returnKeyType="done"
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
        <Text style={styles.headerTitle}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* CATEGORÍAS */}
        <Text style={styles.sectionTitle}>Categorías</Text>
        <View style={styles.section}>
          <DraggableFlatList
            data={categories}
            keyExtractor={(item) => item}
            onDragEnd={({ data }) => reorderCategories(data)}
            renderItem={renderCategoryItem}
            scrollEnabled={false}
            activationDistance={10}
          />
          {addingCat ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="Nueva categoría"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleAddCategory}
              />
              <TouchableOpacity onPress={handleAddCategory} disabled={savingCat} style={styles.confirmBtn}>
                {savingCat
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmBtnText}>Agregar</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingCat(false); setNewCategory(''); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addTrigger} onPress={() => setAddingCat(true)}>
              <Text style={styles.addTriggerText}>+ Agregar categoría</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MÉTODOS DE PAGO */}
        <Text style={styles.sectionTitle}>Métodos de pago</Text>
        <View style={styles.section}>
          <DraggableFlatList
            data={paymentMethods}
            keyExtractor={(item) => item}
            onDragEnd={({ data }) => reorderPaymentMethods(data)}
            renderItem={renderPaymentItem}
            scrollEnabled={false}
            activationDistance={10}
          />
          {addingPay ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newPayment}
                onChangeText={setNewPayment}
                placeholder="Nuevo método"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleAddPayment}
              />
              <TouchableOpacity onPress={handleAddPayment} disabled={savingPay} style={styles.confirmBtn}>
                {savingPay
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmBtnText}>Agregar</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingPay(false); setNewPayment(''); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addTrigger} onPress={() => setAddingPay(true)}>
              <Text style={styles.addTriggerText}>+ Agregar método</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  body: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  rowActive: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.background,
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
    color: Colors.danger,
    fontWeight: '600',
  },
  addTrigger: {
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  addTriggerText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    padding: 8,
  },
  cancelBtnText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
