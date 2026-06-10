import React from 'react';
import {
  View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CATEGORY_COLORS } from '../../constants/categories';

export interface TransactionFilterState {
  text: string;
  category: string | null;
  onlyFixed: boolean;
}

export const EMPTY_FILTERS: TransactionFilterState = { text: '', category: null, onlyFixed: false };

export function hasActiveFilters(f: TransactionFilterState): boolean {
  return f.text.trim() !== '' || f.category !== null || f.onlyFixed;
}

interface Props {
  filters: TransactionFilterState;
  onChange: (f: TransactionFilterState) => void;
  categories: string[];
}

export function TransactionFilters({ filters, onChange, categories }: Props) {
  const active = hasActiveFilters(filters);

  const toggleCategory = (cat: string) =>
    onChange({ ...filters, category: filters.category === cat ? null : cat });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={filters.text}
          onChangeText={(text) => onChange({ ...filters, text })}
          placeholder="Buscar gasto, monto o persona…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
        />
        {filters.text.length > 0 && (
          <TouchableOpacity onPress={() => onChange({ ...filters, text: '' })} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {active && (
          <TouchableOpacity style={[styles.chip, styles.clearChip]} onPress={() => onChange(EMPTY_FILTERS)}>
            <Ionicons name="close" size={13} color={Colors.danger} />
            <Text style={[styles.chipText, { color: Colors.danger }]}>Limpiar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.chip, filters.onlyFixed && styles.chipActiveFixed]}
          onPress={() => onChange({ ...filters, onlyFixed: !filters.onlyFixed })}
        >
          <Text style={[styles.chipText, filters.onlyFixed && { color: Colors.primary, fontWeight: '700' }]}>
            Fijos
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isActive = filters.category === cat;
          const color = CATEGORY_COLORS[cat] ?? Colors.primary;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, isActive && { backgroundColor: color + '22', borderColor: color }]}
              onPress={() => toggleCategory(cat)}
            >
              {isActive && <View style={[styles.chipDot, { backgroundColor: color }]} />}
              <Text style={[styles.chipText, isActive && { color, fontWeight: '700' }]} numberOfLines={1}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    gap: 5,
    maxWidth: 180,
  },
  chipActiveFixed: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  clearChip: {
    backgroundColor: Colors.dangerDim,
    borderColor: Colors.danger + '55',
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
});
